// lib/currency/price-format.ts

"use client";

import { DisplayCurrency } from "@/store/use-currency-store";
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

  if (currency === "USD") {
    return { value: amountInUsdCents / 100, usedRate: null as number | null };
  }

  // currency === "CDF"
  if (rate == null || Number.isNaN(rate)) {
    return { value: 0, usedRate: null as number | null };
  }

  return {
    value: (amountInUsdCents / 100) * rate,
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

  if (currency === "USD") return originalAmountInUsdCents / 100;

  if (rate == null || Number.isNaN(rate)) return 0;
  return (originalAmountInUsdCents / 100) * rate;
}

