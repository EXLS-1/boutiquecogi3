import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { isValidUuid } from "@/lib/utils/uuid";
import {
  mapProductDetail,
  PRODUCT_DETAIL_INCLUDE,
  type ProductDetailData,
} from "./product-detail";

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
      include: PRODUCT_DETAIL_INCLUDE,
    });

    return product ? mapProductDetail(product) : null;
  },
);
