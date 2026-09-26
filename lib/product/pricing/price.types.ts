// lib/product/pricing/price.types.ts
// =============================================================================
// PRICING — Types du domaine (FEUILLE : aucune dépendance produit)
// =============================================================================
// CONVENTION : tout montant est un ENTIER en CENTIMES (MoneyCents).
// Les Decimal du schéma (ProductPrice.amount) sont normalisés à la lecture
// par `toCents()` (price.service.ts) — jamais exposés tels quels.

import type { Prisma } from "@prisma/client";

/** `Decimal` constructible exposé aux types du domaine sans tirer Prisma. */
export type Decimal = Prisma.Decimal;

export type MoneyCents = number;

/** Contexte de résolution : qui achète, où, quand, dans quel catalogue. */
export interface PriceContext {
  currency?: string;
  country?: string | null;
  region?: string | null;
  /** Catalogue demandé (un produit peut être vendu dans N catalogues). */
  catalogId?: string | null;
  /** Instant de résolution (défaut : maintenant). */
  at?: Date;
}

/** Couche qui a fourni le prix gagnant — trace d'audit. */
export type PriceSource =
  | "CATALOG_OVERRIDE"
  | "PRODUCT_PRICE"
  | "SALE_PRICE"
  | "BASE_PRICE";

/** Une couche évaluée : matchée ou non, pour l'explicabilité. */
export interface PriceLayer {
  source: PriceSource;
  amount: MoneyCents | null;
  /** true = couche active (fenêtre temporelle + contexte satisfaits). */
  matched: boolean;
  detail?: string;
}

export interface ResolvedPrice {
  amount: MoneyCents;
  compareAtPrice: MoneyCents | null;
  /** Couche gagnante de la hiérarchie. */
  source: PriceSource;
  /** Trace complète de la résolution (débogage + audit). */
  layers: PriceLayer[];
}

/**
 * Forme de lecture d'un prix, alignée sur le schéma Prisma :
 *   - `ProductPrice.amount`          → Decimal  (montant décimal)
 *   - `ProductPrice.compareAtPrice`  → Int?     (DÉJÀ en centimes, non converti)
 *   - `CatalogProduct.priceOverride` → Decimal? (montant décimal)
 * Le service convertit les Decimal en centimes via `toCents()`.
 */
export interface PriceableProduct {
  id: string;
  productPrices: {
    currency: string;
    amount: Decimal;
    compareAtPrice: number | null;
    country: string | null;
    region: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
  }[];
  catalogs: {
    catalogId: string;
    priceOverride: Decimal | null;
    isActive: boolean;
  }[];
}

/** Payload d'écriture d'un prix (Service → Repository). */
export interface SetPriceInput {
  productId: string;
  currency: string;
  amount: MoneyCents;
  compareAtPrice?: MoneyCents | null;
  country?: string | null;
  region?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

/** Erreur métier du domaine pricing (→ Action/API). */
export class PricingError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 400,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PricingError";
  }
}
