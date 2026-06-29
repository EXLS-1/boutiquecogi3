// data/constants/currency.constants.ts

export const SUPPORTED_CURRENCIES = {
  USD: { code: "USD", symbol: "$", decimals: 2 },
  CDF: { code: "CDF", symbol: "FC", decimals: 0 },
} as const;

export const DEFAULT_CURRENCY = "USD";
