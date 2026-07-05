"use client";

import { DisplayCurrency } from "@/store/use-currency-store";

export type BaseCurrencyAmount = {
  /** Montant en cents USD */
  amountInUsdCents: number;
  /** Taux USD->CDF (1 USD = rate CDF). Peut être null si non chargé. */
  rate: number | null;
};

type FormatOptions = {
  /** Devise à afficher */
  currency: DisplayCurrency;
  /** Règles de fraction (optionnel, sinon déterminées par devise) */
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

function getFractionDigits(currency: DisplayCurrency) {
  if (currency === "USD") return { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return { minimumFractionDigits: 0, maximumFractionDigits: 0 };
}

function formatCurrency(value: number, currency: DisplayCurrency, opts?: FormatOptions) {
  const frac = getFractionDigits(currency);
  const minFD = opts?.minimumFractionDigits ?? frac.minimumFractionDigits;
  const maxFD = opts?.maximumFractionDigits ?? frac.maximumFractionDigits;

  const locale = currency === "USD" ? "en-US" : "fr-CD";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: minFD,
    maximumFractionDigits: maxFD,
  }).format(value);
}

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
  return formatCurrency(value, currency);
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

