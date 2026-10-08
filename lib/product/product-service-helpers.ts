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
  salePrice?: number;
  saleStart?: Date;
  saleEnd?: Date;
  isActive?: boolean;
  isFeatured?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  videoUrl?: string | null;
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
      ...(input.seoTitle !== undefined && { seoTitle: input.seoTitle }),
      ...(input.seoDescription !== undefined && { seoDescription: input.seoDescription }),
      ...(input.videoUrl !== undefined && { videoUrl: input.videoUrl }),
    } satisfies Prisma.ProductUncheckedUpdateInput;

    await tx.product.update({ where: { id: productId }, data: updateData });

    if (input.basePrice !== undefined || input.salePrice !== undefined ||
        input.saleStart !== undefined || input.saleEnd !== undefined) {
      const currentPrice = await tx.productPrice.findFirst({
        where: { productId, currency: existing.currency },
        orderBy: { startsAt: "desc" },
        select: { id: true, amount: true, compareAtPrice: true, startsAt: true, endsAt: true },
      });
      const currentBasePrice = currentPrice?.compareAtPrice != null
        ? currentPrice.compareAtPrice / 100
        : currentPrice
          ? Number(currentPrice.amount)
          : undefined;
      const basePrice = input.basePrice ?? currentBasePrice;
      const amount = input.salePrice ?? input.basePrice;

      if (input.basePrice !== undefined &&
          (!Number.isFinite(input.basePrice) || input.basePrice < 0)) {
        throw new ProductServiceError("Le prix doit être un nombre positif ou nul", "VALIDATION_ERROR", 400);
      }
      if (input.salePrice !== undefined &&
          (!Number.isFinite(input.salePrice) || input.salePrice <= 0 ||
            (basePrice !== undefined && input.salePrice >= basePrice))) {
        throw new ProductServiceError("Le prix promotionnel doit être positif et inférieur au prix de base", "VALIDATION_ERROR", 400);
      }
      if (input.salePrice !== undefined && basePrice === undefined) {
        throw new ProductServiceError("Un prix de base est requis pour appliquer une promotion", "VALIDATION_ERROR", 400);
      }

      const startsAt = input.saleStart ?? currentPrice?.startsAt ?? null;
      const endsAt = input.saleEnd ?? currentPrice?.endsAt ?? null;
      if (startsAt && endsAt && endsAt <= startsAt) {
        throw new ProductServiceError("La période promotionnelle est invalide", "VALIDATION_ERROR", 400);
      }

      const priceData = {
        ...(amount !== undefined && { amount }),
        ...(input.salePrice !== undefined && {
          compareAtPrice: basePrice === undefined ? null : Math.round(basePrice * 100),
        }),
        ...(input.saleStart !== undefined && { startsAt: input.saleStart }),
        ...(input.saleEnd !== undefined && { endsAt: input.saleEnd }),
      };
      if (currentPrice) {
        await tx.productPrice.update({
          where: { id: currentPrice.id },
          data: priceData,
        });
      } else if (amount !== undefined) {
        await tx.productPrice.create({
          data: {
            productId,
            currency: existing.currency,
            amount,
            compareAtPrice: input.salePrice !== undefined
              ? Math.round((basePrice ?? 0) * 100)
              : null,
            startsAt: input.saleStart ?? null,
            endsAt: input.saleEnd ?? null,
          },
        });
      } else if (input.saleStart !== undefined || input.saleEnd !== undefined) {
        throw new ProductServiceError("Un prix est requis pour modifier la période promotionnelle", "VALIDATION_ERROR", 400);
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

    const auditValue = {
      ...updateData,
      ...(input.basePrice !== undefined && { basePrice: input.basePrice }),
      ...(input.salePrice !== undefined && { salePrice: input.salePrice }),
      ...(input.saleStart !== undefined && { saleStart: input.saleStart }),
      ...(input.saleEnd !== undefined && { saleEnd: input.saleEnd }),
    };
    await recordProductAudit({
      action: PRODUCT_AUDIT_ACTIONS.UPDATED,
      userId: actor.userId, productId,
      newValue: auditValue,
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
