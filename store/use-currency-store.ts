// store/use-currency-store.ts
// This store manages the selected display currency and the exchange rate from USD to CDF.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_USD_TO_CDF_RATE } from "@/lib/currency/exchange-rate-constants";
import { DisplayCurrency } from "@/lib/currency/exchange-rate-currency";

interface CurrencyState {
  currency: DisplayCurrency;
  rateUsdToCdf: number;

  setCurrency: (currency: DisplayCurrency) => void;

  setExchangeRate: (rate: number) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: "USD",

      rateUsdToCdf: DEFAULT_USD_TO_CDF_RATE,

      setCurrency: (currency) =>
        set({
          currency,
        }),

      setExchangeRate: (rate) =>
        set((state) => ({
          rateUsdToCdf:
            Number.isFinite(rate) && rate > 0 ? rate : state.rateUsdToCdf,
        })),
    }),

    {
      name: "boutiquecogi-currency-storage",

      version: 1,

      skipHydration: true,
    },
  ),
);
