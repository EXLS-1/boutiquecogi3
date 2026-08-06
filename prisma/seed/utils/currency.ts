// prisma/seed/utils/currency.ts
// ============================================
// CONVERSION & FORMATAGE USD <-> CDF SANS ERREUR DE FLOTTANT
// ============================================
// Le franc congolais (CDF) manipule de grands nombres sans centimes, tandis
// que l'USD utilise 2 décimales. On travaille exclusivement avec des entiers
// (cents / francs) pour éviter tout problème d'arrondi dans les agrégations.

export interface Money {
  amount: number; // entier : cents pour USD, francs pour CDF
  currency: "USD" | "CDF";
}

/** Taux de change fixe pour le seed (déterministe, pas de fetch réseau). */
export const SEED_EXCHANGE_RATE_USD_CDF = 2850;

/**
 * Convertit un montant USD (en cents) vers un montant CDF (en francs),
 * arrondi à l'unité (CDF n'a pas de centimes).
 */
export function usdCentsToCdf(usdCents: number, rate = SEED_EXCHANGE_RATE_USD_CDF): number {
  return Math.round((usdCents / 100) * rate);
}

/**
 * Convertit un montant CDF (francs) vers USD cents.
 */
export function cdfToUsdCents(cdf: number, rate = SEED_EXCHANGE_RATE_USD_CDF): number {
  return Math.round((cdf / rate) * 100);
}

/** Dollar (décimal) -> cents (entier), sans erreur de flottant. */
export function usdToCents(usd: number): number {
  return Math.round(usd * 100);
}

/** Cents (entier) -> dollar (décimal, 2 décimales) en string sûre pour Decimal. */
export function centsToUsdString(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Format une devise pour l'affichage dans les logs. */
export function formatMoney(money: Money): string {
  return money.currency === "USD"
    ? `$${(money.amount / 100).toFixed(2)}`
    : `${money.amount} FC`;
}

/** Construit un prix USD/CDF double à partir d'un USD décimal. */
export function buildDualPrice(usd: number): { usdCents: number; cdf: number } {
  const usdCents = usdToCents(usd);
  return { usdCents, cdf: usdCentsToCdf(usdCents) };
}
