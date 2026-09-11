// lib/product-pricing/pricing.types.ts
// =============================================================================
// PRICING PRODUIT — Types du domaine
// =============================================================================
// CONVENTION DU DOMAINE : tout montant est un ENTIER en CENTIMES (Int).
// (aligné sur ProductPrice.amount, Order.subtotalAmount, Product.salePrice).
// Les Decimal(10,2) du schéma (price/basePrice) sont normalisés à la lecture.

export type MoneyCents = number;

export interface PriceContext {
  currency?: string;
  country?: string | null;
  region?: string | null;
  /** Catalogue demandé (le produit peut être vendu dans N catalogues). */
  catalogId?: string | null;
  /** Instant de résolution (défaut : maintenant). */
  at?: Date;
}

export interface ResolvedPrice {
  amount: MoneyCents;
  compareAtPrice: MoneyCents | null;
  /** Couche gagnante de la hiérarchie. */
  source: PriceSource;
  /** Trace de la résolution (débogage + audit). */
  layers: PriceLayer[];
}

export type PriceSource =
  | "CATALOG_OVERRIDE"
  | "PRODUCT_PRICE"
  | "SALE_PRICE"
  | "BASE_PRICE";

export interface PriceLayer {
  source: PriceSource;
  amount: MoneyCents | null;
  /** true = couche active (fenêtre temporelle OK, contexte OK). */
  matched: boolean;
  detail?: string;
}
