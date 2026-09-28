import { ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STATUS_TRANSITIONS } from "@/lib/product/product-constant";
import { ProductError } from "@/lib/product/product-errors";

export async function transitionProductStatus(
  productId: string,
  targetStatus: ProductStatus,
  options: { actedBy: string; reason?: string; scheduledAt?: Date },
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: { productImages: true, stock: true, variants: { include: { variantStocks: true } } },
    });
    if (!product) throw new ProductError("Produit introuvable", "PRODUCT_NOT_FOUND", 404);
    if (product.isdeleted) throw new ProductError("Un produit supprimé ne peut pas changer de statut", "PRODUCT_DELETED", 409);

    const allowed = STATUS_TRANSITIONS[product.status];
    if (product.status === targetStatus || !allowed?.includes(targetStatus)) {
      throw new ProductError(`Transition non autorisée de ${product.status} vers ${targetStatus}`, "INVALID_STATUS_TRANSITION", 400);
    }
    if (targetStatus === ProductStatus.SCHEDULED && (!options.scheduledAt || options.scheduledAt <= new Date())) {
      throw new ProductError("Une date future est requise pour planifier la publication", "VALIDATION_ERROR", 400);
    }
    if (targetStatus === ProductStatus.PUBLISHED) {
      if (product.productImages.length === 0) {
        throw new ProductError("Publication impossible : au moins une image est requise", "VALIDATION_ERROR", 400);
      }
      const variantAvailable = product.variants.reduce(
        (total, variant) => total + variant.variantStocks.reduce((sum, stock) => sum + stock.quantity - stock.reserved, 0),
        0,
      );
      const availableStock = product.variants.length > 0
        ? variantAvailable
        : (product.stock?.quantity ?? 0) - (product.stock?.reserved ?? 0);
      if (availableStock <= 0) throw new ProductError("Publication impossible : stock disponible insuffisant", "VALIDATION_ERROR", 400);
    }

    await tx.product.update({
      where: { id: productId },
      data: {
        status: targetStatus,
        isActive: targetStatus === ProductStatus.PUBLISHED,
        isArchived: targetStatus === ProductStatus.ARCHIVED,
        publishedAt: targetStatus === ProductStatus.PUBLISHED ? new Date() : product.publishedAt,
        publishedById: targetStatus === ProductStatus.PUBLISHED ? options.actedBy : product.publishedById,
        scheduledAt: targetStatus === ProductStatus.SCHEDULED ? options.scheduledAt ?? null : null,
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
