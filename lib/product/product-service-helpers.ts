// lib/product/product-service-helpers.ts

// Helpers essentiels pour les Server Actions

import { ProductStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordProductAudit, PRODUCT_AUDIT_ACTIONS } from "@/lib/product-audit/product-audit.index";
import {
  findProductById,
  findVariantById,
  findPriceById,
} from "@/lib/product/product-lookups";
import { ProductError, ProductServiceError } from "@/lib/product/product-errors";
import { emitProductEvent } from "@/lib/product/product-events";
import { canDeleteProduct } from "@/lib/product/product-policy";
import type { ProductActor } from "@/lib/product/product-types";

// Interface pour les données de mise à jour
interface UpdateProductInput {
  name?: string;
  description?: string | null;
  sku?: string;
  basePrice?: number;
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
      select: { isdeleted: true, currency: true }
    });
    if (!existing) throw new ProductServiceError("Produit introuvable", "NOT_FOUND");
    if (existing.isdeleted) throw new ProductServiceError("Produit supprimé", "ALREADY_DELETED");

    const updateData = {
      ...(input.name !== undefined && { name: input.name }),
      // undefined conserve la description ; null la vide (colonne non nullable).
      ...(input.description !== undefined && { description: input.description ?? "" }),
      ...(input.sku !== undefined && { sku: input.sku }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.isFeatured !== undefined && { isFeatured: input.isFeatured }),
    } satisfies Prisma.ProductUncheckedUpdateInput;

    await tx.product.update({ where: { id: productId }, data: updateData });

    if (input.basePrice !== undefined) {
      if (!Number.isFinite(input.basePrice) || input.basePrice < 0) {
        throw new ProductServiceError("Le prix doit être un nombre positif ou nul", "VALIDATION_ERROR", 400);
      }
      const currentPrice = await tx.productPrice.findFirst({
        where: { productId, currency: existing.currency },
        select: { id: true },
      });
      if (currentPrice) {
        await tx.productPrice.update({ where: { id: currentPrice.id }, data: { amount: input.basePrice } });
      } else {
        await tx.productPrice.create({ data: { productId, currency: existing.currency, amount: input.basePrice } });
      }
    }

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
  await emitProductEvent("PRODUCT_UPDATED", productId, { updatedBy: actor.userId });
}

// SUPPRESSION

export async function deleteProduct(
  productId: string,
  actor: ProductActor,
  reason?: string
): Promise<void> {
  const decision = await canDeleteProduct(actor);
  if (!decision.allowed) {
    throw new ProductError(decision.reasons.join("; "), "FORBIDDEN", 403);
  }

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, status: true, isdeleted: true },
    });
    if (!product) throw new ProductServiceError("Produit introuvable", "NOT_FOUND", 404);
    if (product.isdeleted) throw new ProductServiceError("Produit déjà supprimé", "ALREADY_DELETED", 409);

    await tx.product.update({
      where: { id: productId },
      data: {
        isdeleted: true,
        deletedAt: new Date(),
        status: ProductStatus.ARCHIVED,
        isArchived: true,
      },
    });

    await tx.productStatusHistory.create({
      data: {
        productId,
        oldStatus: product.status,
        newStatus: ProductStatus.ARCHIVED,
        reason: reason ?? "Suppression douce",
        changedById: actor.userId,
      },
    });

    await recordProductAudit({
      action: PRODUCT_AUDIT_ACTIONS.DELETED,
      userId: actor.userId,
      productId,
      details: reason ? `Suppression: ${reason}` : "Suppression douce",
    }, tx);
  });

  await emitProductEvent("PRODUCT_DELETED", productId, { deletedBy: actor.userId });
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
      data: { isdeleted: false, deletedAt: null, status: ProductStatus.DRAFT, isArchived: false, isActive: false }
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
  await emitProductEvent("PRODUCT_RESTORED", productId, { restoredBy: actor.userId });
}
