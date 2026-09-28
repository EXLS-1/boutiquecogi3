import { prisma } from "@/lib/prisma";
import { ProductStatus, StockMovementType, TransactionType } from "@prisma/client";
import { ProductError, ProductNotFoundError, ProductVariantNotFoundError, InsufficientStockError } from "@/lib/product/product-errors";
import { transitionProductStatus } from "@/lib/product/product-workflow";
import { emitProductEvent } from "@/lib/product/product-events";
import type { CreateProductDto } from "@/lib/product/product-types";

export class ProductService {
  static async create(input: CreateProductDto, userId: string) {
    return prisma.$transaction(async (tx) => {
      const slug = input.slug ?? input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      
      const product = await tx.product.create({
        data: {
          name: input.name,
          slug,
          sku: input.sku ?? `SKU-${Date.now()}`,
          description: input.description ?? "",
          basePrice: input.basePrice,
          currency: input.currency ?? "USD",
          categoryId: input.categoryId ?? null,
          userId,
          createdBy: userId,
          status: ProductStatus.DRAFT,
          stock: {
            create: { quantity: 0, reserved: 0, updatedBy: userId },
          },
        },
      });

      let totalStock = 0;
      if (input.variants && input.variants.length > 0) {
        for (const v of input.variants) {
          const variant = await tx.productVariant.create({
            data: {
              productId: product.id,
              sku: v.sku ?? `${product.sku}-${Math.random().toString(36).substring(2, 7)}`,
              attributes: v.attributes as any,
              priceOffset: v.priceOffset ?? 0,
            },
          });

          await tx.variantStock.create({
            data: {
              variantId: variant.id,
              quantity: v.initialStock,
              reserved: 0,
              updatedBy: userId,
            },
          });
          totalStock += v.initialStock;
        }

        await tx.stock.update({
          where: { productId: product.id },
          data: { quantity: totalStock },
        });
      }

      await tx.product_Availability_Projection.create({
        data: { productId: product.id, isAvailable: totalStock > 0 },
      });

      await emitProductEvent("PRODUCT_CREATED", product.id, { createdBy: userId });

      return { productId: product.id, slug: product.slug, totalStock };
    });
  }

  static async adjustVariantStock(variantId: string, delta: number, reason: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const variantStock = await tx.variantStock.findUnique({
        where: { variantId },
        include: { variant: true },
      });

      if (!variantStock) {
        throw new ProductVariantNotFoundError(variantId);
      }

      const newQuantity = variantStock.quantity + delta;
      if (newQuantity < 0) {
        throw new InsufficientStockError(variantId, Math.abs(delta), variantStock.quantity);
      }

      await tx.variantStock.update({
        where: { variantId },
        data: { quantity: newQuantity, updatedBy: userId },
      });

      const allStocks = await tx.variantStock.findMany({
        where: { variant: { productId: variantStock.variant.productId } },
      });
      const aggregatedStock = allStocks.reduce((acc, s) => acc + s.quantity, 0);

      const stock = await tx.stock.update({
        where: { productId: variantStock.variant.productId },
        data: { quantity: aggregatedStock, lastMovementAt: new Date(), updatedBy: userId },
      });

      await tx.stockMovement.create({
        data: {
          stockId: stock.id,
          type: delta > 0 ? StockMovementType.IN : StockMovementType.OUT,
          quantity: Math.abs(delta),
          delta,
          reason,
          userId,
        },
      });

      await tx.product_Availability_Projection.upsert({
        where: { productId: variantStock.variant.productId },
        create: { productId: variantStock.variant.productId, isAvailable: aggregatedStock > 0 },
        update: { isAvailable: aggregatedStock > 0 },
      });

      await emitProductEvent("PRODUCT_STOCK_ADJUSTED", variantStock.variant.productId, { variantId, delta });
    });
  }

  static async publish(productId: string, userId: string) {
    await transitionProductStatus(productId, ProductStatus.PUBLISHED, { actedBy: userId });
    await emitProductEvent("PRODUCT_STATUS_CHANGED", productId, { status: ProductStatus.PUBLISHED });
  }

  static async softDelete(productId: string, userId: string) {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new ProductNotFoundError(productId);

      await tx.product.update({
        where: { id: productId },
        data: { isdeleted: true, deletedAt: new Date(), status: ProductStatus.ARCHIVED },
      });
    });
    await emitProductEvent("PRODUCT_DELETED", productId, { deletedBy: userId });
  }
}
