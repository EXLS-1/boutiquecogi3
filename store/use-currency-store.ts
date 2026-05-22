"use client";
import { create } from "zustand";
import {
  convertFromUSDCents,
  type DisplayCurrency,
  USD_TO_CDF_RATE,
} from "@/lib/currency/currency";

interface CurrencyState {
  // État principal
  displayCurrency: DisplayCurrency;

  // Accesseurs rétro-compatibles
  currency: DisplayCurrency;

  // Taux de change
  rateUsdToCdf: number;

  // Actions
  setDisplayCurrency: (currency: DisplayCurrency) => void;
  setCurrency: (currency: DisplayCurrency) => void;

  /** Convertit un prix en centimes USD pour l'affichage */
  formatPrice: (cents: number) => string;
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  displayCurrency: "USD", // sera écrasé au chargement du cookie

  get currency() {
    return get().displayCurrency;
  },

  rateUsdToCdf: USD_TO_CDF_RATE,

  setDisplayCurrency: (currency) => set({ displayCurrency: currency }),

  setCurrency: (currency) => set({ displayCurrency: currency }),

  formatPrice: (cents) => {
    const currency = get().displayCurrency;
    if (currency === "USD") {
      return `$${(cents / 100).toFixed(2)}`;
    } else {
      const cdf = convertFromUSDCents(cents, "CDF");
      return `${cdf.toFixed(2)} FC`;
    }
  },
}));
