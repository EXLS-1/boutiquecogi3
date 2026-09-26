// lib/product/pricing/price.service.ts
// =============================================================================
// PRICING — SERVICE (logique métier pure, AUCUN import Prisma)
// =============================================================================
// HIÉRARCHIE (priorité décroissante) :
//   1. CatalogProduct.priceOverride → surcharge explicite par catalogue
//   2. ProductPrice                 → fenêtre startsAt/endsAt + pays/région/devise
//   3. SALE_PRICE                   → promotion, si applicable
//   4. BASE_PRICE                   → base de référence
//
// RÈGLES :
//   - AUCUNE lecture de prix hors de ce module (pages, actions, API).
//   - La couche gagnante ET la trace complète sont renvoyées (audit).
//   - CONVENTION : montants en CENTIMES (Int) dans tout le domaine.
//
// `resolvePrice()` est PUR (testable sans DB). `getPrice()` est le seul
// point d'entrée qui lit, et il délègue la lecture au repository.

import type {
  MoneyCents,
  PriceContext,
  PriceLayer,
  PriceSource,
  PriceableProduct,
  ResolvedPrice,
  SetPriceInput,
} from "./price.types";
import { PricingError } from "./price.types";
import {
  createPrice,
  decimalToCents,
  deletePriceById,
  findCatalogPriceOverride,
  findPriceById,
  findPriceableProduct,
  listPricesForProduct,
  setCatalogPriceOverride,
  updatePriceById,
} from "./price.repository";

/** Normalise un Decimal / number / string en centimes entiers. */
export function toCents(value: unknown): MoneyCents {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Math.round(value * 100);
  return decimalToCents(value as never);
}

function isWindowActive(
  startsAt: Date | null | undefined,
  endsAt: Date | null | undefined,
  at: Date,
): boolean {
  if (startsAt && startsAt > at) return false;
  if (endsAt && endsAt < at) return false;
  return true;
}

function isGeoMatch(
  country: string | null | undefined,
  region: string | null | undefined,
  context: PriceContext,
): boolean {
  // Ni pays ni région = prix universel.
  if (!country && !region) return true;
  // Un prix géolocalisé exige un contexte géolocalisé.
  if (country && !context.country) return false;
  if (region && !context.region) return false;
  if (country && context.country && country !== context.country) return false;
  if (region && context.region && region !== context.region) return false;
  return true;
}

/**
 * Résolution PURE : calcule le prix depuis un produit déjà chargé.
 * `basePriceCents` / `salePriceCents` sont injectés car les colonnes
 * correspondantes ont été retirées du schéma au profit de ProductPrice.
 */
export function resolvePrice(
  product: PriceableProduct,
  context: PriceContext = {},
  basePriceCents: MoneyCents = 0,
  salePriceCents: MoneyCents | null = null,
): ResolvedPrice {
  const at = context.at ?? new Date();
  const layers: PriceLayer[] = [];

  // ── 1. Surcharge catalogue ────────────────────────────────────────────────
  let catalogOverride: MoneyCents | null = null;
  if (context.catalogId) {
    const entry = product.catalogs.find(
      (c) => c.catalogId === context.catalogId && c.isActive,
    );
    if (entry?.priceOverride != null) {
      catalogOverride = toCents(entry.priceOverride);
      layers.push({
        source: "CATALOG_OVERRIDE",
        amount: catalogOverride,
        matched: true,
        detail: `catalogue ${context.catalogId}`,
      });
    }
  }

  // ── 2. ProductPrice planifié (devise + géo + fenêtre) ────────────────────
  const candidates = product.productPrices.filter(
    (p) =>
      (!context.currency || p.currency === context.currency) &&
      isGeoMatch(p.country, p.region, context) &&
      isWindowActive(p.startsAt, p.endsAt, at),
  );
  // Le plus récent gagne : `startsAt` le plus élevé, sinon le plus gros montant.
  candidates.sort((a, b) => {
    const atMs = a.startsAt?.getTime() ?? 0;
    const btMs = b.startsAt?.getTime() ?? 0;
    if (atMs !== btMs) return btMs - atMs;
    return decimalToCents(b.amount) - decimalToCents(a.amount);
  });
  const plannedCandidate = candidates[0];
  const planned = plannedCandidate ? decimalToCents(plannedCandidate.amount) : null;
  layers.push({
    source: "PRODUCT_PRICE",
    amount: planned,
    matched: planned != null,
    ...(plannedCandidate?.startsAt
      ? { detail: `depuis ${plannedCandidate.startsAt.toISOString()}` }
      : {}),
  });

  // ── 3. Promotion ─────────────────────────────────────────────────────────
  const saleActive = salePriceCents != null && salePriceCents > 0;
  layers.push({
    source: "SALE_PRICE",
    amount: saleActive ? salePriceCents : null,
    matched: saleActive,
  });

  // ── 4. Base ──────────────────────────────────────────────────────────────
  layers.push({ source: "BASE_PRICE", amount: basePriceCents, matched: true });

  // ── Couche gagnante ──────────────────────────────────────────────────────
  const source: PriceSource =
    catalogOverride != null
      ? "CATALOG_OVERRIDE"
      : planned != null
        ? "PRODUCT_PRICE"
        : saleActive
          ? "SALE_PRICE"
          : "BASE_PRICE";

  // Chaque couche absente retombe sur la suivante.
  const amount: MoneyCents =
    catalogOverride ?? planned ?? (saleActive ? salePriceCents : null) ?? basePriceCents;

  // Prix barré : la base, dès qu'une couche la dépasse.
  const compareAtPrice: MoneyCents | null =
    source !== "BASE_PRICE" && basePriceCents > amount ? basePriceCents : null;

  return { amount, compareAtPrice, source, layers };
}

/**
 * Point d'entrée unique pour TOUTE lecture de prix.
 * Charge via le repository puis délègue à la résolution pure.
 */
export async function getPrice(
  productId: string,
  context: PriceContext = {},
): Promise<ResolvedPrice> {
  const product = await findPriceableProduct(productId);
  if (!product) {
    throw new PricingError(
      `Produit introuvable pour résolution de prix : ${productId}`,
      "PRICING_PRODUCT_NOT_FOUND",
      404,
    );
  }
  return resolvePrice(product, context, 0, null);
}


/**
 * Règles de cohérence d'un prix saisi.
 * @returns liste de messages d'erreur (vide = valide).
 */
export function validatePriceRules(input: SetPriceInput): string[] {
  const errors: string[] = [];
  if (input.amount <= 0) {
    errors.push("Le montant du prix doit être supérieur à 0.");
  }
  if (input.compareAtPrice != null && input.compareAtPrice <= input.amount) {
    errors.push("Le prix barré doit être supérieur au prix de vente.");
  }
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) {
    errors.push("La fenêtre de validité est invalide (fin <= début).");
  }
  return errors;
}

/** Crée un prix après validation métier. */
export async function setPrice(input: SetPriceInput): Promise<{ id: string }> {
  const errors = validatePriceRules(input);
  if (errors.length > 0) {
    throw new PricingError("Règles de prix invalides", "PRICING_INVALID_RULES", 400, {
      errors,
    });
  }
  const created = await createPrice(input);
  return { id: created.id };
}

export async function getPriceById(priceId: string) {
  return findPriceById(priceId);
}

/**
 * Édition partielle d'un prix. Les règles ne sont rejouées que si le montant
 * est fourni : sinon on n'aurait pas le prix courant pour comparer.
 */
export async function editPrice(
  priceId: string,
  input: Partial<Omit<SetPriceInput, "productId">>,
): Promise<{ id: string }> {
  if (input.amount !== undefined) {
    const errors = validatePriceRules({
      productId: "",
      currency: input.currency ?? "USD",
      amount: input.amount,
      compareAtPrice: input.compareAtPrice,
      country: input.country,
      region: input.region,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    });
    if (errors.length > 0) {
      throw new PricingError("Règles de prix invalides", "PRICING_INVALID_RULES", 400, {
        errors,
      });
    }
  }
  const updated = await updatePriceById(priceId, input);
  return { id: updated.id };
}

export async function removePrice(priceId: string): Promise<void> {
  await deletePriceById(priceId);
}

/** Prix d'un produit, normalisés en centimes pour l'UI. */
export async function listPrices(productId: string) {
  const rows = await listPricesForProduct(productId);
  return rows.map((row) => ({
    id: row.id,
    currency: row.currency,
    amountCents: decimalToCents(row.amount),
    // compareAtPrice est un Int? : déjà en centimes.
    compareAtPriceCents: row.compareAtPrice,
    country: row.country,
    region: row.region,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  }));
}

export async function getCatalogOverride(
  catalogId: string,
  productId: string,
): Promise<MoneyCents | null> {
  const row = await findCatalogPriceOverride(catalogId, productId);
  return row?.priceOverride == null ? null : decimalToCents(row.priceOverride);
}

export async function setCatalogOverride(
  catalogId: string,
  productId: string,
  priceOverride: MoneyCents | null,
) {
  if (priceOverride != null && priceOverride <= 0) {
    throw new PricingError(
      "La surcharge de prix doit être supérieure à 0.",
      "PRICING_INVALID_OVERRIDE",
      400,
    );
  }
  return setCatalogPriceOverride(catalogId, productId, priceOverride);
}

export { PricingError } from "./price.types";
export type {
  MoneyCents,
  PriceContext,
  PriceLayer,
  PriceSource,
  PriceableProduct,
  ResolvedPrice,
  SetPriceInput,
} from "./price.types";

