// lib/currency/price-format.ts

import type { DisplayCurrency } from "@/store/use-currency-store";
import { formatCurrency } from "@/lib/utils/currency";

export type BaseCurrencyAmount = {
  /** Montant en cents USD */
  amountInUsdCents: number;
  /** Taux USD->CDF (1 USD = rate CDF). Peut être null si non chargé. */
  rate: number | null;
};

/**
 * Convertit un montant de base (cents USD) vers la devise d’affichage.
 * - USD: cents -> unités USD
 * - CDF: cents USD -> unités USD -> * rate => unités CDF
 * Robustesse: si rate null, on n’affiche pas une valeur incohérente.
 */
export function convertFromUsdCents(params: BaseCurrencyAmount, currency: DisplayCurrency) {
  const { amountInUsdCents, rate } = params;
  const safeAmount = Number.isFinite(amountInUsdCents) && amountInUsdCents > 0
    ? amountInUsdCents
    : 0;

  if (currency === "USD") {
    return { value: safeAmount / 100, usedRate: null as number | null };
  }

  // currency === "CDF"
  if (rate == null || !Number.isFinite(rate) || rate <= 0) {
    return { value: 0, usedRate: null as number | null };
  }

  return {
    value: (safeAmount / 100) * rate,
    usedRate: rate,
  };
}

export function formatPriceFromUsdCents(
  params: BaseCurrencyAmount,
  currency: DisplayCurrency
) {
  const { value } = convertFromUsdCents(params, currency);
  return formatCurrency(value, { currency });
}

/**
 * Calcule la valeur "original" pour une promo.
 * originalAmount est aussi en cents USD.
 */
export function computeConvertedAmountForOriginal(
  params: BaseCurrencyAmount,
  currency: DisplayCurrency,
  originalAmountInUsdCents: number
) {
  const { rate } = params;

  if (currency === "USD") return Number.isFinite(originalAmountInUsdCents) ? Math.max(0, originalAmountInUsdCents) / 100 : 0;

  if (rate == null || !Number.isFinite(rate) || rate <= 0 || !Number.isFinite(originalAmountInUsdCents)) return 0;
  return (originalAmountInUsdCents / 100) * rate;
}

