// lib/products/product-service-publish.ts
// Gestion de la publication et des statuts

import { ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordProductAudit, PRODUCT_AUDIT_ACTIONS } from "@/lib/product-audit/product-audit.index";
import { ProductServiceError } from "./product.service";

// REJET
export async function rejectForReview(
  productId: string,
  actor: { userId: string },
  reason: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId }, select: { id: true, status: true }
    });
    if (!product || product.status !== ProductStatus.PENDING) {
      throw new ProductServiceError("Produit en attente requis", "INVALID_STATUS");
    }

    await tx.product.update({
      where: { id: productId }, data: { status: ProductStatus.DRAFT }
    });

    await tx.productStatusHistory.create({
      data: {
        productId, oldStatus: ProductStatus.PENDING,
        newStatus: ProductStatus.DRAFT, reason,
        changedById: actor.userId
      }
    });

    await recordProductAudit({
      action: PRODUCT_AUDIT_ACTIONS.REJECTED,
      userId: actor.userId, productId,
      newValue: { status: ProductStatus.DRAFT },
      details: `Rejeté: ${reason}`
    }, tx);
  }, { isolationLevel: "Serializable" as const, maxWait: 5000, timeout: 15000 });
}

// ARRÊT COMMERCIAL
export async function discontinueProduct(
  productId: string,
  actor: { userId: string },
  reason: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId }, select: { id: true, status: true }
    });
    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new ProductServiceError("Produit publié requis", "INVALID_STATUS");
    }

    await tx.product.update({
      where: { id: productId }, data: { status: ProductStatus.DISCONTINUED }
    });

    await tx.productStatusHistory.create({
      data: {
        productId, oldStatus: ProductStatus.PUBLISHED,
        newStatus: ProductStatus.DISCONTINUED, reason,
        changedById: actor.userId
      }
    });

    await recordProductAudit({
      action: PRODUCT_AUDIT_ACTIONS.DISCONTINUED,
      userId: actor.userId, productId,
      newValue: { status: ProductStatus.DISCONTINUED },
      details: `Arrêté: ${reason}`
    }, tx);
  }, { isolationLevel: "Serializable" as const, maxWait: 5000, timeout: 15000 });
}