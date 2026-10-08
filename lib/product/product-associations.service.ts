import { prisma } from "@/lib/prisma";
import { ProductServiceError } from "@/lib/product/product-errors";

async function assertProductExists(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isdeleted: true },
  });
  if (!product || product.isdeleted) {
    throw new ProductServiceError("Produit introuvable", "NOT_FOUND", 404);
  }
}

export async function attachProductMedia(input: {
  productId: string;
  urls: string[];
  altTexts?: string[];
}) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: input.productId },
      select: { id: true, isdeleted: true, _count: { select: { productImages: true } } },
    });
    if (!product || product.isdeleted) {
      throw new ProductServiceError("Produit introuvable", "NOT_FOUND", 404);
    }
    if (product._count.productImages + input.urls.length > 20) {
      throw new ProductServiceError("Un produit ne peut pas avoir plus de 20 images", "MEDIA_LIMIT_EXCEEDED", 400);
    }

    const startPosition = product._count.productImages;
    await tx.productImage.createMany({
      data: input.urls.map((url, index) => ({
        productId: input.productId,
        url,
        alt: input.altTexts?.[index] ?? null,
        position: startPosition + index,
      })),
    });
    return tx.productImage.findMany({
      where: { productId: input.productId },
      orderBy: { position: "asc" },
    });
  });
}

export async function detachProductMedia(productId: string, mediaIds: string[]) {
  return prisma.$transaction(async (tx) => {
    const owned = await tx.productImage.findMany({
      where: { productId, id: { in: mediaIds } },
      select: { id: true },
    });
    if (owned.length !== new Set(mediaIds).size) {
      throw new ProductServiceError("Un ou plusieurs médias n'appartiennent pas à ce produit", "MEDIA_NOT_FOUND", 404);
    }

    await tx.productImage.deleteMany({ where: { productId, id: { in: mediaIds } } });
    const remaining = await tx.productImage.findMany({
      where: { productId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    for (const [position, media] of remaining.entries()) {
      await tx.productImage.update({
        where: { id: media.id },
        data: { position },
      });
    }
    return { detachedCount: mediaIds.length };
  });
}

export async function reorderProductMedia(productId: string, orderedMediaIds: string[]) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.productImage.findMany({
      where: { productId },
      select: { id: true },
    });
    const submittedIds = new Set(orderedMediaIds);
    if (
      submittedIds.size !== orderedMediaIds.length ||
      current.length !== orderedMediaIds.length ||
      current.some(({ id }) => !submittedIds.has(id))
    ) {
      throw new ProductServiceError("La liste doit contenir chaque média du produit une seule fois", "INVALID_MEDIA_ORDER", 400);
    }

    for (const [position, id] of orderedMediaIds.entries()) {
      await tx.productImage.update({
        where: { id },
        data: { position },
      });
    }
    return { productId, orderedMediaIds };
  });
}

export async function attachProductTags(productId: string, tagIds: string[]) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, isdeleted: true },
    });
    if (!product || product.isdeleted) {
      throw new ProductServiceError("Produit introuvable", "NOT_FOUND", 404);
    }

    const uniqueTagIds = [...new Set(tagIds)];
    const existingTags = await tx.tag.findMany({
      where: { id: { in: uniqueTagIds } },
      select: { id: true },
    });
    if (existingTags.length !== uniqueTagIds.length) {
      throw new ProductServiceError("Un ou plusieurs tags sont introuvables", "TAG_NOT_FOUND", 404);
    }

    const result = await tx.productTag.createMany({
      data: uniqueTagIds.map((tagId) => ({ productId, tagId })),
      skipDuplicates: true,
    });
    return { attachedCount: result.count };
  });
}

export async function detachProductTags(productId: string, tagIds: string[]) {
  await assertProductExists(productId);
  const result = await prisma.productTag.deleteMany({
    where: { productId, tagId: { in: [...new Set(tagIds)] } },
  });
  return { detachedCount: result.count };
}
