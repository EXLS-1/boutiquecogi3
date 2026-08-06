// prisma/seed/shared/currencies.ts
// ============================================
// DEVISES SUPPORTÉES & TAUX DE CHANGE INITIAUX
// ============================================

export interface SeedCurrency {
  code: "USD" | "CDF";
  symbol: string;
  decimals: number;
  rateToUsd: number; // 1 unité de cette devise = X USD
  isDefault: boolean;
}

/** Taux de change initial déterministe (pas de fetch réseau). */
export const SEED_EXCHANGE_RATE_USD_CDF = 2850;

export const CURRENCIES: SeedCurrency[] = [
  {
    code: "USD",
    symbol: "$",
    decimals: 2,
    rateToUsd: 1,
    isDefault: true,
  },
  {
    code: "CDF",
    symbol: "FC",
    decimals: 0,
    rateToUsd: 1 / SEED_EXCHANGE_RATE_USD_CDF,
    isDefault: false,
  },
];

/** Devise par défaut de la boutique. */
export const DEFAULT_CURRENCY = "USD";

/** Convertit un montant USD cents vers CDF francs. */
export function usdCentsToCdf(usdCents: number, rate = SEED_EXCHANGE_RATE_USD_CDF): number {
  return Math.round((usdCents / 100) * rate);
}
