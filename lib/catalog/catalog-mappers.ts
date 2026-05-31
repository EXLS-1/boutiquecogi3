// lib/catalog/catalog-mappers.ts
// This file contains functions for mapping catalog products to their display representations.

import { usdToCdf } from "@/lib/currency/convert";
import { PRODUCT_PLACEHOLDER } from "./catalog-constants";

export function mapCatalogProduct(product: any) {
  return {
    ...product,

    image: product.productImages?.[0]?.url ?? PRODUCT_PLACEHOLDER,

    basePriceUSD: product.basePrice,

    basePriceCDF: usdToCdf(product.basePrice),

    isAvailable: product.availabilityProjection?.isAvailable ?? false,

    categoryName: product.category?.name ?? null,

    categorySlug: product.category?.slug ?? null,
  };
}
