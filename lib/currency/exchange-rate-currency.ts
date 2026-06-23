// lib/currency/exchange-rate-currency.ts
// =============================================================================
// Métadonnées des devises et formatage monétaire.
// Supporte USD et CDF avec formatage localisé.
// =============================================================================

import {
  DisplayCurrency,
  CurrencyMetadata,
} from "../exchange-rate/exchange-rate-types";

// ─── Définitions des devises ──────────────────────────────────────────────────

export const CURRENCIES: Readonly<Record<DisplayCurrency, CurrencyMetadata>> = {
  USD: {
    code: "USD",
    symbol: "$",
    label: "Dollar Américain",
    locale: "en-US",
    precision: 2,
  },
  CDF: {
    code: "CDF",
    symbol: "FC",
    label: "Franc Congolais",
    locale: "fr-CD",
    precision: 0,
  },
} as const;

/** Liste des codes de devise supportés. */
export const SUPPORTED_CURRENCY_CODES: readonly DisplayCurrency[] = Object.keys(
  CURRENCIES,
) as DisplayCurrency[];

// ─── Accesseurs ───────────────────────────────────────────────────────────────

/**
 * Retourne les métadonnées d'une devise.
 * @param currency - Code de devise
 * @returns Métadonnées de la devise (USD par défaut si invalide)
 */
export function getCurrencyMetadata(
  currency: DisplayCurrency,
): CurrencyMetadata {
  return CURRENCIES[currency] ?? CURRENCIES.USD;
}

// ─── Formatters (lazy initialization, réutilisables) ─────────────────────────

const FORMATTERS: Readonly<Record<DisplayCurrency, Intl.NumberFormat>> = {
  USD: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  CDF: new Intl.NumberFormat("fr-CD", {
    style: "currency",
    currency: "CDF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
};

/**
 * Formate un montant en devise avec la locale appropriée.
 * @param amount - Montant numérique
 * @param currency - Code de devise
 * @returns Chaîne formatée (ex: "2 400 FC" ou "$100.00")
 */
export function formatPrice(amount: number, currency: DisplayCurrency): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const formatter = FORMATTERS[currency] ?? FORMATTERS.USD;
  return formatter.format(safeAmount);
}
