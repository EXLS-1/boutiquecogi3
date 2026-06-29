// data/types/common.types.ts
// Base commune pour tout le système

export interface Price {
  amount: number;
  currencyCode: string;
  isTaxIncluded: boolean; // Essentiel pour un e-commerce robuste
}

export interface ProductImage {
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
}

export interface Stock {
  variantId: string;
  quantity: number;
  isInfinite: boolean; // Pour les produits digitaux
}
