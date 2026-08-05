// lib/utils/currency.ts

export type CurrencyCode = "USD" | "CDF";

interface FormatCurrencyOptions {
  currency?: CurrencyCode;
  locale?: string;
}

/**
 * Arrondit de façon déterministe un montant financier à N décimales.
 * Évite les dérives d'arrondis IEEE 754.
 */
export function roundToFinancial(amount: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

/**
 * Formate un montant en devise locale de manière stricte.
 */
export function formatCurrency(
  amount: number,
  options: FormatCurrencyOptions = {}
): string {
  const { currency = "USD", locale = "fr-CD" } = options;

  // Pour le CDF, les décimales ne sont généralement pas affichées en caisse
  const decimals = currency === "CDF" ? 0 : 2;
  const safeAmount = roundToFinancial(amount, decimals);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(safeAmount);
  } catch {
    // Fallback de sécurité si le moteur JS ne supporte pas la locale/devise
    return `${safeAmount.toFixed(decimals)} ${currency}`;
  }
}