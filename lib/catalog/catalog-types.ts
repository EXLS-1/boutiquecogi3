// lib/catalog/catalog-types.ts

export interface CatalogProduct {
  id: string;
  name: string;
  description: string | null;

  basePrice: number;

  image: string;

  basePriceUSD: number;
  basePriceCDF: number;

  isAvailable: boolean;

  categoryName?: string | null;
  categorySlug?: string | null;
}
