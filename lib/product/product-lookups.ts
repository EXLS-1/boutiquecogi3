// lib/product/product-lookups.ts

import { prisma } from "@/lib/prisma";

export function findProductById(productId: string) {
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

export function findVariantById(variantId: string) {
  return prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { variantStocks: true, product: true },
  });
}

export function findPriceById(priceId: string) {
  return prisma.productPrice.findUnique({
    where: { id: priceId },
    include: { product: { select: { id: true } } },
  });
}
