// lib/product/product-lookups.ts

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PRODUCT_LIST_INCLUDE = {
  productType: { select: { type: true } },
  productPrice: { take: 1, orderBy: { startsAt: "desc" } },
  category: { select: { id: true, name: true } },
  stock: { select: { quantity: true, reserved: true } },
  availabilityProjection: { select: { isAvailable: true } },
  _count: { select: { productImages: true, variants: true, catalogs: true, productTags: true } },
} satisfies Prisma.ProductInclude;

export const PRODUCT_DETAIL_INCLUDE = {
  ...PRODUCT_LIST_INCLUDE,
  variants: { include: { variantStocks: true } },
  productPrice: true,
  productImages: { orderBy: { position: "asc" } },
  statusHistory: { orderBy: { changedAt: "desc" } },
  categoryProducts: { include: { category: true } },
  catalogs: { include: { catalog: true } },
  productTags: { include: { tag: true } },
} satisfies Prisma.ProductInclude;

export function findProductById(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: { include: { variantStocks: true } },
      productPrice: true,
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
