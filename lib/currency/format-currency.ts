// lib/currency/format-currency.ts

export type CurrencyCode = "USD" | "CDF";

/**
 * Formate un prix en USD de manière standardisée.
 */
export function formatPriceUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formate un prix en Francs Congolais (CDF).
 */
export function formatPriceCDF(amount: number): string {
  return new Intl.NumberFormat("fr-CD", {
    style: "currency",
    currency: "CDF",
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formate une date au format français (utilisé en RDC).
 * Exemple: 22 mai 2026
 */
export function formatDateFR(date: Date | string | number): string {
  const d =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * Format court pour les historiques (ex: 22/05/2026)
 */
export function formatDateTimeShort(date: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}
