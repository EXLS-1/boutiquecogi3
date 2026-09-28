// lib/product/product-workflow.ts

import { prisma } from "@/lib/prisma";
import { ProductStatus } from "@prisma/client";
import { STATUS_TRANSITIONS } from "@/lib/product/product-constant";
import { ProductError } from "@/lib/product/product-errors";

export async function transitionProductStatus(
  productId: string,
  targetStatus: ProductStatus,
  options: { actedBy: string; reason?: string; scheduledAt?: Date }
): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      productImages: true,
      variants: { include: { variantStocks: true } },
    },
  });

  if (!product) {
    throw new ProductError("Produit introuvable", "PRODUCT_NOT_FOUND", 404);
  }

  const allowed = STATUS_TRANSITIONS[product.status];
  if (!allowed || !allowed.includes(targetStatus)) {
    throw new ProductError(
      `Transition non autorisée de ${product.status} vers ${targetStatus}`,
      "INVALID_STATUS_TRANSITION",
      400
    );
  }

  if (targetStatus === ProductStatus.PUBLISHED) {
    if (product.productImages.length === 0) {
      throw new ProductError("Publication impossible: au moins une image est requise", "VALIDATION_ERROR", 400);
    }
    const totalStock = product.variants.reduce(
      (acc, v) => acc + v.variantStocks.reduce((sAcc, s) => sAcc + (s.quantity - s.reserved), 0),
      0
    );
    if (totalStock <= 0) {
      throw new ProductError("Publication impossible: stock disponible insuffisant", "VALIDATION_ERROR", 400);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        status: targetStatus,
        isActive: targetStatus === ProductStatus.PUBLISHED,
        publishedAt: targetStatus === ProductStatus.PUBLISHED ? new Date() : product.publishedAt,
        publishedById: targetStatus === ProductStatus.PUBLISHED ? options.actedBy : product.publishedById,
        scheduledAt: targetStatus === ProductStatus.SCHEDULED ? options.scheduledAt : null,
      },
    });

    await tx.productStatusHistory.create({
      data: {
        productId,
        oldStatus: product.status,
        newStatus: targetStatus,
        reason: options.reason ?? `Passage au statut ${targetStatus}`,
        changedById: options.actedBy,
      },
    });
  });
}
