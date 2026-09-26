import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { isValidUuid } from "@/lib/utils";
import { mapProductDetail, type ProductDetailData } from "./product-detail";

/** Source commune à la fiche produit et à l'aperçu public (UUID ou slug). */
export const getProductData = cache(
  async (identifier: string): Promise<ProductDetailData | null> => {
    const id = identifier.trim();
    if (!id || id.length > 200) return null;

    const product = await prisma.product.findFirst({
      where: {
        ...(isValidUuid(id) ? { OR: [{ id }, { slug: id }] } : { slug: id }),
        isArchived: false,
        isdeleted: false,
        deletedAt: null,
        status: "PUBLISHED",
      },
      include: {
        category: true,
        stock: true,
        availabilityProjection: true,
        productImages: { orderBy: { position: "asc" } },
        variants: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          include: {
            variantStocks: {
              select: { quantity: true, reserved: true },
            },
          },
        },
        productOptions: true,
        productTags: { include: { tag: true } },
        productAttributeValues: { include: { attribute: true } },
        productReviews: {
          include: { user: { select: { name: true, image: true } } },
          orderBy: { createdAt: "desc" },
        },
        productPrices: true,
        coupon: true,
        taxClass: true,
      },
    });

    return product
      ? mapProductDetail(product as Parameters<typeof mapProductDetail>[0])
      : null;
  },
);
