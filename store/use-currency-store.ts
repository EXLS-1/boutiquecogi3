import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  DisplayCurrency,
  DEFAULT_USD_TO_CDF_RATE,
} from "@/lib/currency/currency";

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
