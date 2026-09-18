// lib/products/product-service-helpers.ts
// Helpers essentiels pour les Server Actions

import { ProductStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordProductAudit, PRODUCT_AUDIT_ACTIONS } from "@/lib/product-audit/product-audit.index";
import { ProductServiceError } from "./product.service";
import {
  findProductById,
  findVariantById,
  findPriceById,
} from "./product-lookups";

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

// RECHERCHE — délégation au module de lectures partagé (source unique des includes)
export async function getProductById(productId: string) {
  return findProductById(productId);
}

export async function getVariantById(variantId: string) {
  return findVariantById(variantId);
}

export async function getPriceById(priceId: string) {
  return findPriceById(priceId);
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

    const updateData = {
      ...(input.name !== undefined && { name: input.name }),
      // undefined conserve la description ; null la vide (colonne non nullable).
      ...(input.description !== undefined && { description: input.description ?? "" }),
      ...(input.sku !== undefined && { sku: input.sku }),
      ...(input.basePrice !== undefined && { basePrice: input.basePrice }),
      ...(input.salePrice !== undefined && { salePrice: input.salePrice }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.isFeatured !== undefined && { isFeatured: input.isFeatured }),
    } satisfies Prisma.ProductUncheckedUpdateInput & Prisma.InputJsonObject;

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