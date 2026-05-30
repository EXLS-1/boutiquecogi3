// store/use-currency-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type DisplayCurrency, USD_TO_CDF_RATE } from "@/lib/currency/currency";

interface CurrencyState {
  activeCurrency: DisplayCurrency;
  exchangeRate: number;
  
  // Actions
  setCurrency: (currency: DisplayCurrency) => void;
  setExchangeRate: (rate: number) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      activeCurrency: "USD",
      exchangeRate: USD_TO_CDF_RATE, // Valeur de fallback initiale
      
      setCurrency: (currency) => set({ activeCurrency: currency }),
      setExchangeRate: (rate) => set({ exchangeRate: rate }),
    }),
    {
      name: "boutiquecogi-currency-storage",
      // Si tu gères déjà l'hydratation via un cookie serveur, 
      // tu peux ajouter skipHydration: true ici pour éviter les conflits SSR
    }
  )
);