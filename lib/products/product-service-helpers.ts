// lib/products/product-service-helpers.ts
// Helpers essentiels pour les Server Actions

import { ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordProductAudit, PRODUCT_AUDIT_ACTIONS } from "@/lib/product-audit/product-audit.index";
import { ProductServiceError } from "./product.service";

// Interface pour les données de mise à jour
interface UpdateProductInput {
  name?: string;
  description?: string | null;
  sku?: string;
  basePrice?: number;
  salePrice?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  categoryIds?: string[];
  tagIds?: string[];
}

// RECHERCHE
export async function getProductById(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: { include: { variantStocks: true } },
      productPrices: true,
      productImages: { orderBy: { position: "asc" } },
      statusHistory: { orderBy: { changedAt: "desc" } },
      categoryProducts: { include: { category: true } },
      catalogs: { include: { catalog: true } },
      productTags: { include: { tag: true } },
    },
  });
}

export async function getVariantById(variantId: string) {
  return prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { variantStocks: true, product: true },
  });
}

export async function getPriceById(priceId: string) {
  return prisma.productPrice.findUnique({
    where: { id: priceId },
    include: { product: { select: { id: true } } },
  });
}

// MISE À JOUR
export async function updateProduct(
  productId: string,
  input: UpdateProductInput,
  actor: { userId: string }
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({
      where: { id: productId },
      select: { isdeleted: true }
    });
    if (!existing) throw new ProductServiceError("Produit introuvable", "NOT_FOUND");
    if (existing.isdeleted) throw new ProductServiceError("Produit supprimé", "ALREADY_DELETED");

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.sku !== undefined) updateData.sku = input.sku;
    if (input.basePrice !== undefined) updateData.basePrice = input.basePrice;
    if (input.salePrice !== undefined) updateData.salePrice = input.salePrice;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.isFeatured !== undefined) updateData.isFeatured = input.isFeatured;

    await tx.product.update({ where: { id: productId }, data: updateData });

    if (input.categoryIds) {
      await tx.categoryProduct.deleteMany({ where: { productId } });
      if (input.categoryIds.length > 0) {
        await tx.categoryProduct.createMany({
          data: input.categoryIds.map((id: string, idx: number) => ({
            productId, categoryId: id, displayOrder: idx
          })),
        });
      }
    }

    if (input.tagIds) {
      await tx.productTag.deleteMany({ where: { productId } });
      if (input.tagIds.length > 0) {
        await tx.productTag.createMany({
          data: input.tagIds.map((tagId: string) => ({ productId, tagId })),
        });
      }
    }

    await recordProductAudit({
      action: PRODUCT_AUDIT_ACTIONS.UPDATED,
      userId: actor.userId, productId,
      newValue: updateData,
      details: "Produit mis à jour",
    }, tx);
  }, { isolationLevel: "Serializable" as const, maxWait: 5000, timeout: 15000 });
}

// SUPPRESSION
export async function deleteProduct(
  productId: string,
  actor: { userId: string },
  reason?: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, status: true, isdeleted: true }
    });
    if (!product) throw new ProductServiceError("Produit introuvable", "NOT_FOUND");
    if (product.isdeleted) throw new ProductServiceError("Produit déjà supprimé", "ALREADY_DELETED");

    await tx.product.update({
      where: { id: productId },
      data: { isdeleted: true, deletedAt: new Date(), status: ProductStatus.ARCHIVED }
    });

    await tx.productStatusHistory.create({
      data: {
        productId, oldStatus: product.status,
        newStatus: ProductStatus.ARCHIVED,
        reason: reason ?? "Suppression douce",
        changedById: actor.userId
      }
    });

    await recordProductAudit({
      action: PRODUCT_AUDIT_ACTIONS.DELETED,
      userId: actor.userId, productId,
      details: reason ? `Suppression: ${reason}` : "Suppression douce"
    }, tx);
  }, { isolationLevel: "Serializable" as const, maxWait: 5000, timeout: 15000 });
}

// RESTAURATION
export async function restoreProduct(
  productId: string,
  actor: { userId: string }
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, isdeleted: true, status: true }
    });
    if (!product) throw new ProductServiceError("Produit introuvable", "NOT_FOUND");
    if (!product.isdeleted) throw new ProductServiceError("Produit non supprimé", "NOT_DELETED");

    await tx.product.update({
      where: { id: productId },
      data: { isdeleted: false, deletedAt: null, status: ProductStatus.DRAFT }
    });

    await tx.productStatusHistory.create({
      data: {
        productId, oldStatus: product.status,
        newStatus: ProductStatus.DRAFT,
        reason: "Restauration",
        changedById: actor.userId
      }
    });

    await recordProductAudit({
      action: PRODUCT_AUDIT_ACTIONS.RESTORED,
      userId: actor.userId, productId,
      details: "Produit restauré"
    }, tx);
  }, { isolationLevel: "Serializable" as const, maxWait: 5000, timeout: 15000 });
}