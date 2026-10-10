import { prisma } from "@/lib/prisma";
import { ProductStatus, StockMovementType } from "@prisma/client";
import { ProductError, ProductNotFoundError, ProductVariantNotFoundError, InsufficientStockError } from "@/lib/product/product-errors";
import { transitionProductStatus } from "@/lib/product/product-workflow";
import { emitProductEvent } from "@/lib/product/product-events";
import type { CreateProductDto } from "@/lib/product/product-types";
import { PRODUCT_LIMITS } from "@/lib/product/product-constant";
import { mapProductToDetails } from "@/lib/product/product-mapper";
import type { ProductDetails } from "@/lib/product/types";
import { isValidUuid } from "@/lib/utils";

export class ProductService {
  /**
   * Détail complet d'un produit pour le portail admin (édition + vue détail).
   * Retourne `null` si l'id n'est pas un UUID valide ou si le produit
   * n'existe pas — les pages appelantes branchent alors sur `notFound()`.
   * Le prix de base est dérivé de la grille `productPrice` (le schéma ne
   * porte plus de colonne `basePrice` scalaire).
   */
  static async getDetails(productId: string): Promise<ProductDetails | null> {
    if (!isValidUuid(productId)) return null;

    const row = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        productType: { select: { id: true, type: true, label: true, maxVariants: true, requiresApproval: true } },
        productPrice: true,
        variants: {
          include: { variantStocks: true },
          orderBy: { sku: "asc" },
        },
        productImages: { orderBy: { position: "asc" } },
        productTags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        categoryProducts: {
          include: { category: { select: { id: true, name: true, slug: true } } },
          orderBy: { displayOrder: "asc" },
        },
        catalogs: { include: { catalog: { select: { id: true, name: true } } } },
        productAttributeValues: true,
        productReviews: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        statusHistory: {
          include: { changedBy: { select: { id: true, name: true } } },
          orderBy: { changedAt: "desc" },
          take: 100,
        },
        stock: { select: { quantity: true, reserved: true } },
        availabilityProjection: { select: { isAvailable: true } },
      },
    });

    if (!row) return null;
    return mapProductToDetails(row);
  }

  static async create(input: CreateProductDto, userId: string) {
    const name = input.name.trim();
    if (name.length < PRODUCT_LIMITS.NAME_MIN || name.length > PRODUCT_LIMITS.NAME_MAX) throw new ProductError("Invalid product name length", "VALIDATION_ERROR", 400);
    if ((input.variants?.length ?? 0) > PRODUCT_LIMITS.VARIANT_MAX) throw new ProductError("Too many variants", "VALIDATION_ERROR", 400);
    if ((input.images?.length ?? 0) > PRODUCT_LIMITS.MAX_IMAGES_PER_PRODUCT) throw new ProductError("Too many product images", "VALIDATION_ERROR", 400);
    if ((input.variants ?? []).some((variant) => !Number.isSafeInteger(variant.initialStock) || variant.initialStock < 0)) throw new ProductError("Initial stock must be a non-negative integer", "VALIDATION_ERROR", 400);
    if (name.length < PRODUCT_LIMITS.NAME_MIN || name.length > PRODUCT_LIMITS.NAME_MAX) throw new ProductError("Invalid product name length", "VALIDATION_ERROR", 400);
    const slug = (input.slug ?? name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).trim();
    if (!slug || slug.length > PRODUCT_LIMITS.SKU_MAX) throw new ProductError("Slug is missing or too long", "VALIDATION_ERROR", 400);
    if (!Number.isFinite(input.basePrice) || input.basePrice < 0 || input.basePrice > PRODUCT_LIMITS.PRICE_MAX) throw new ProductError("Price is outside the allowed range", "VALIDATION_ERROR", 400);
    const productType = input.productTypeId
      ? await prisma.productTypeConfig.findUnique({ where: { id: input.productTypeId } })
      : await prisma.productTypeConfig.findFirst({ where: { isDefault: true, isActive: true } });
    if (!productType || !productType.isActive) {
      throw new ProductError("Le type de produit est absent ou inactif", "INVALID_PRODUCT_TYPE", 400);
    }
    const sku = input.sku?.trim() || `SKU-${crypto.randomUUID()}`;
      
    const result = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.product.findFirst({ where: { OR: [{ slug }, { sku }] }, select: { slug: true, sku: true } });
      if (duplicate?.slug === slug) throw new Error(`Le slug Ãƒâ€šÃ‚Â« ${slug} Ãƒâ€šÃ‚Â» est dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  utilisÃƒÆ’Ã‚Â©`);
      if (duplicate?.sku === sku) throw new Error(`Le SKU Ãƒâ€šÃ‚Â« ${sku} Ãƒâ€šÃ‚Â» est dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  utilisÃƒÆ’Ã‚Â©`);
      const product = await tx.product.create({
        data: {
          name,
          slug,
          sku,
          description: input.description ?? "",
          currency: input.currency ?? "USD",
          categoryId: input.categoryId ?? null,
          productTypeId: productType.id,
          isFeatured: input.isFeatured ?? false,
          seoTitle: input.seoTitle ?? null,
          seoDescription: input.seoDescription ?? null,
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
              sku: v.sku?.trim() || `SKU-${crypto.randomUUID()}`,
              attributes: v.attributes,
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

      await tx.productPrice.create({ data: {
        productId: product.id,
        currency: input.currency ?? "USD",
        amount: input.basePrice,
        compareAtPrice: input.compareAtPrice ?? null,
      } });
      if (input.prices?.length) {
        await tx.productPrice.createMany({ data: input.prices.map((price) => ({
          productId: product.id,
          currency: price.currency,
          amount: price.amount,
          compareAtPrice: price.compareAtPrice ?? null,
          country: price.country ?? null,
          region: price.region ?? null,
          startsAt: price.startsAt ?? null,
          endsAt: price.endsAt ?? null,
        })) });
      }
      if (input.images?.length) {
        await tx.productImage.createMany({ data: input.images.map((url, position) => ({ productId: product.id, url, position })) });
      }
      if (input.categoryIds?.length) {
        await tx.categoryProduct.createMany({ data: input.categoryIds.map((categoryId, displayOrder) => ({ productId: product.id, categoryId, displayOrder })) });
      }
      if (input.tagIds?.length) {
        await tx.productTag.createMany({ data: input.tagIds.map((tagId) => ({ productId: product.id, tagId })) });
      }
      await tx.product_Availability_Projection.create({
        data: { productId: product.id, isAvailable: totalStock > 0 },
      });

      return { productId: product.id, slug: product.slug, totalStock };
    });
    await emitProductEvent("PRODUCT_CREATED", result.productId, { createdBy: userId });
    return result;
  }

  static async adjustVariantStock(variantId: string, delta: number, reason: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      if (!Number.isInteger(delta) || delta === 0) throw new ProductError("La variation de stock doit ÃƒÆ’Ã‚Âªtre un entier non nul", "VALIDATION_ERROR", 400);
      const variantStock = await tx.variantStock.findFirst({
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
        where: { id: variantStock.id },
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

  static async setStatus(
    productId: string,
    status: ProductStatus,
    userId: string,
    reason?: string,
    scheduledAt?: Date,
  ) {
    await transitionProductStatus(productId, status, {
      actedBy: userId,
      reason,
      scheduledAt,
    });
    await emitProductEvent("PRODUCT_STATUS_CHANGED", productId, { status });
  }

  static async publish(productId: string, userId: string, reason?: string) {
    await this.setStatus(productId, ProductStatus.PUBLISHED, userId, reason);
  }

  static async softDelete(productId: string, userId: string, reason = "Suppression douce") {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId }, select: { status: true, isdeleted: true } });
      if (!product) throw new ProductNotFoundError(productId);
      if (product.isdeleted) throw new ProductError("Produit dÃƒÂ©jÃƒÂ  supprimÃƒÂ©", "ALREADY_DELETED", 409);

      await tx.product.update({
        where: { id: productId },
        data: { isdeleted: true, deletedAt: new Date(), status: ProductStatus.ARCHIVED, isArchived: true, isActive: false },
      });
      await tx.productStatusHistory.create({ data: {
        productId,
        oldStatus: product.status,
        newStatus: ProductStatus.ARCHIVED,
        reason,
        changedById: userId,
      } });
    });
    await emitProductEvent("PRODUCT_DELETED", productId, { deletedBy: userId });
  }
}
