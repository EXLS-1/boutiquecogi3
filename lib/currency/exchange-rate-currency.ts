// lib/currency/exchange-rate-currency.ts
// =============================================================================
// Métadonnées des devises et formatage monétaire.
// Supporte USD et CDF avec formatage localisé.
// =============================================================================

import {
  DisplayCurrency,
  CurrencyMetadata,
} from "./exchange-rate-types";
import { formatCurrency } from "@/lib/utils/currency";

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

/**
 * Formate un montant en devise avec la locale appropriée.
 * @param amount - Montant numérique
 * @param currency - Code de devise
 * @returns Chaîne formatée (ex: "2 400 FC" ou "$100.00")
 */
export function formatPrice(amount: number, currency: DisplayCurrency): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return formatCurrency(safeAmount, { currency });
}
