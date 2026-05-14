"use client";
import { create } from "zustand";
import { convertFromUSDCents, type DisplayCurrency, USD_TO_CDF_RATE } from "@/lib/currency";

interface CurrencyState {
  displayCurrency: DisplayCurrency;
  setDisplayCurrency: (currency: DisplayCurrency) => void;
  /** Convertit un prix en centimes USD pour l'affichage */
  formatPrice: (cents: number) => string;
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  displayCurrency: "USD", // sera écrasé au chargement du cookie
  setDisplayCurrency: (currency) => set({ displayCurrency: currency }),

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
