// store/use-currency-store.ts
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { setDisplayCurrency } from "@/lib/actions/currency.actions";

export type DisplayCurrency = "USD" | "CDF";

interface ExchangeRateState {
  rate: number | null;
  lastUpdated: string | null;
  isLoading: boolean;
  error: string | null;
}

interface CurrencyStore extends ExchangeRateState {
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => Promise<void>;
  fetchRate: () => Promise<void>;
  clearError: () => void;
}

const INITIAL_RATE_STATE: ExchangeRateState = {
  rate: null,
  lastUpdated: null,
  isLoading: false,
  error: null,
};

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set, get) => ({
      currency: "USD",
      ...INITIAL_RATE_STATE,

      setCurrency: async (currency) => {
        if (currency === get().currency) return;

        // 1. Persistance serveur (cookie)
        await setDisplayCurrency(currency);

        // 2. Mise à jour state local
        set({ currency, ...INITIAL_RATE_STATE });

        // 3. Rafraîchissement du taux si on passe en CDF
        if (currency === "CDF") {
          await get().fetchRate();
        }
      },

      fetchRate: async () => {
        set({ isLoading: true, error: null });

        try {
          const res = await fetch("/api/exchange-rate", {
            cache: "no-store",
            headers: { Accept: "application/json" },
          });

          if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            throw new Error(payload?.error?.message || `HTTP ${res.status}`);
          }

          const data = await res.json();

          if (!data.success || !data.rate) {
            throw new Error("Réponse API invalide");
          }

          set({
            rate: parseFloat(data.rate),
            lastUpdated: data.timestamp,
            isLoading: false,
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Erreur inconnue",
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "currency-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currency: state.currency,
        // On ne persiste PAS le taux en localStorage pour forcer un re-fetch frais
      }),
    },
  ),
);
