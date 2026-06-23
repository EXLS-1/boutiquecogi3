// lib/currency/currency.ts

export type DisplayCurrency = "USD" | "CDF";

export interface CurrencyMetadata {
  code: DisplayCurrency;
  symbol: string;
  label: string;
  locale: string;
  precision: number;
}

export const CURRENCIES: Record<DisplayCurrency, CurrencyMetadata> = {
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
};

export const SUPPORTED_CURRENCY_CODES = Object.keys(
  CURRENCIES,
) as DisplayCurrency[];

export function getCurrencyMetadata(
  currency: DisplayCurrency,
): CurrencyMetadata {
  return CURRENCIES[currency] ?? CURRENCIES.USD;
}

const FORMATTERS = {
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

export function formatPrice(amount: number, currency: DisplayCurrency): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return FORMATTERS[currency].format(safeAmount);
}
