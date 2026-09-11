// lib/product-pricing/pricing.service.ts
// =============================================================================
// PRICING PRODUIT — Machine de résolution hiérarchique (UNIQUE source de vérité)
// =============================================================================
// HIÉRARCHIE (priorité décroissante) :
//   1. CatalogProduct.priceOverride      → surcharge explicite par catalogue
//   2. ProductPrice (planifié/geo)       → fenêtre startsAt/endsAt + country/region/currency
//   3. Product.salePrice (+saleStart/saleEnd) → promotion simple
//   4. Product.basePrice                 → prix de référence
//
// RÈGLES :
//   - AUCUNE lecture de prix hors de ce module (pages, actions, API).
//   - La couche gagnante + la trace complète sont renvoyées (audit).
//   - CONVENTION : montants en CENTIMES (Int) partout dans le domaine.

import { Prisma, type Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  MoneyCents,
  PriceContext,
  PriceLayer,
  PriceSource,
  ResolvedPrice,
} from "./pricing.types";

/** Normalise un Decimal Prisma ou number/string en centimes entiers. */
export function toCents(value: Prisma.Decimal | number | string): MoneyCents {
  if (value instanceof Prisma.Decimal) return Math.round(value.toNumber() * 100);
  if (typeof value === "string") return Math.round(parseFloat(value) * 100);
  return Math.round(value * 100);
}

function isWindowActive(
  startsAt: Date | null | undefined,
  endsAt: Date | null | undefined,
  at: Date
): boolean {
  if (startsAt && startsAt > at) return false;
  if (endsAt && endsAt < at) return false;
  return true;
}

function isGeoMatch(
  country: string | null | undefined,
  region: string | null | undefined,
  context: PriceContext
): boolean {
  if (!country && !region) return true; // universel
  if (country && context.country && country !== context.country) return false;
  if (region && context.region && region !== context.region) return false;
  if (country && !context.country) return false;
  if (region && !context.region) return false;
  return true;
}

// ─── Résolution pure (testable sans DB) ──────────────────────────────────────

export function resolvePriceFromProduct(
  product: Product & {
    productPrices: {
      currency: string;
      amount: number;
      compareAtPrice: number | null;
      country: string | null;
      region: string | null;
      startsAt: Date | null;
      endsAt: Date | null;
    }[];
    catalogs: {
      catalogId: string;
      priceOverride: Prisma.Decimal | null;
      isActive: boolean;
    }[];
  },
  context: PriceContext = {}
): ResolvedPrice {
  const at = context.at ?? new Date();
  const layers: PriceLayer[] = [];

  // ── 1. Surcharge catalogue ──
  let catalogOverride: MoneyCents | null = null;
  if (context.catalogId) {
    const catalog = product.catalogs.find(
      (c) => c.catalogId === context.catalogId && c.isActive
    );
    if (catalog?.priceOverride != null) {
      catalogOverride = toCents(catalog.priceOverride);
      layers.push({
        source: "CATALOG_OVERRIDE",
        amount: catalogOverride,
        matched: true,
        detail: `catalogue ${catalog.catalogId}`,
      });
    }
  }

  // ── 2. ProductPrice planifié (currency + geo + fenêtre) ──
  const candidates = product.productPrices
    .filter(
      (p) =>
        (!context.currency || p.currency === context.currency) &&
        isWindowActive(p.startsAt, p.endsAt, at) &&
        isGeoMatch(p.country, p.region, context)
    )
    .sort((a, b) => {
      // Spécificité géo décroissante : country+region > country > universel
      const spec = (p: typeof a) => (p.country ? 2 : 0) + (p.region ? 1 : 0);
      return spec(b) - spec(a);
    });

  const planned = candidates[0];
  if (planned) {
    layers.push({
      source: "PRODUCT_PRICE",
      amount: planned.amount,
      matched: true,
      detail: `geo=${planned.country ?? "*"}/${planned.region ?? "*"}`,
    });
  }

  // ── 3. Promotion simple (salePrice + fenêtre) ──
  const saleActive =
    product.salePrice != null &&
    isWindowActive(product.saleStart, product.saleEnd, at);
  if (saleActive) {
    layers.push({
      source: "SALE_PRICE",
      amount: product.salePrice,
      matched: true,
      detail: product.saleEnd
        ? `jusqu'au ${product.saleEnd.toISOString()}`
        : undefined,
    });
  }

  // ── 4. Prix de base (toujours actif) ──
  const basePrice = toCents(product.basePrice);
  layers.push({ source: "BASE_PRICE", amount: basePrice, matched: true });

  // ── Couche gagnante : première couche active de la hiérarchie ──
  const winner: PriceSource =
    catalogOverride != null
      ? "CATALOG_OVERRIDE"
      : planned
        ? "PRODUCT_PRICE"
        : saleActive
          ? "SALE_PRICE"
          : "BASE_PRICE";

  const amount: MoneyCents =
    winner === "CATALOG_OVERRIDE"
      ? catalogOverride
      : winner === "PRODUCT_PRICE"
        ? planned.amount
        : winner === "SALE_PRICE"
          ? product.salePrice
          : basePrice;

  // Prix barré : base si une couche est gagnante, sinon Product.price si supérieur
  let compareAtPrice: MoneyCents | null = null;
  if (winner !== "BASE_PRICE") {
    compareAtPrice = basePrice;
  } else if (product.price && toCents(product.price) > basePrice) {
    compareAtPrice = toCents(product.price);
  }

  return { amount, compareAtPrice, source: winner, layers };
}

// ─── Point d'entrée DB (résolution + chargement des couches) ─────────────────

/**
 * Charge le produit avec ses couches de prix puis résout.
 * Point d'entrée unique pour TOUTE lecture de prix.
 */
export async function resolveProductPrice(
  productId: string,
  context: PriceContext = {}
): Promise<ResolvedPrice> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      productPrices: true,
      catalogs: true,
    },
  });

  if (!product) {
    throw new Error(`PRICING_PRODUCT_NOT_FOUND: ${productId}`);
  }

  return resolvePriceFromProduct(product, context);
}

/**
 * Vérifie la cohérence des prix d'un produit (rules de validation) :
 *   - salePrice < basePrice
 *   - fenêtre de promotion valide (saleEnd > saleStart)
 *   - ProductPrice.amount > 0
 */
export function validatePricingRules(
  product: Pick<
    Product,
    "basePrice" | "price" | "salePrice" | "saleStart" | "saleEnd"
  > & {
    productPrices?: { amount: number; startsAt: Date | null; endsAt: Date | null }[];
  }
): string[] {
  const errors: string[] = [];
  const base = toCents(product.basePrice);

  if (base <= 0) errors.push("Le prix de base doit être supérieur à 0");
  if (product.salePrice != null && product.salePrice >= base) {
    errors.push("Le prix promotionnel doit être inférieur au prix de base");
  }
  if (
    product.saleStart &&
    product.saleEnd &&
    product.saleEnd <= product.saleStart
  ) {
    errors.push("La période promotionnelle est invalide (fin <= début)");
  }
  for (const p of product.productPrices ?? []) {
    if (p.amount <= 0) errors.push("Un ProductPrice a un montant <= 0");
    if (p.startsAt && p.endsAt && p.endsAt <= p.startsAt) {
      errors.push("Un ProductPrice a une fenêtre invalide (fin <= début)");
    }
  }
  return errors;
}

