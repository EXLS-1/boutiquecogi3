// hooks/use-cart-currency.ts
/**
 * Devise d'affichage du panier et du tunnel de paiement.
 *
 * Source unique : la page panier ET le checkout utilisent ce hook, donc :
 *  - la même devise (`USD` / `CDF`) alimente `buildCartSummary` partout ;
 *  - la persistance serveur passe toujours par `setDisplayCurrency` ;
 *  - un échec d'enregistrement restaure la devise précédente (rollback) et
 *    expose un message d'erreur exploitable par l'UI.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrencyStore } from "@/store/use-currency-store";
import {
  resolveCartCurrency,
  type CartCurrency,
} from "@/lib/cart/cart-domain";

export interface CartCurrencyState {
  /** Devise active (une seule source de vérité côté client). */
  currency: CartCurrency;
  /** Taux partagé avec le composant Price (USD vers CDF). */
  rate: number | null;
  /** Écriture serveur en cours. */
  isPending: boolean;
  /** Message d'erreur persistant (rollback effectué). */
  error: string | null;
  /** Sélectionne une devise avec persistance + rollback en cas d'échec. */
  select: (currency: CartCurrency) => Promise<void>;
}

const CURRENCY_ERROR_MESSAGE =
  "Impossible d'enregistrer la devise choisie. Veuillez réessayer.";

export function useCartCurrency(
  initialCurrency: CartCurrency = "USD",
): CartCurrencyState {
  const [currency, setCurrency] = useState<CartCurrency>(() =>
    resolveCartCurrency(initialCurrency),
  );
  const sharedCurrency = useCurrencyStore((state) => state.currency);
  const rate = useCurrencyStore((state) => state.rate);
  const setSharedCurrency = useCurrencyStore((state) => state.setCurrency);
  const fetchRate = useCurrencyStore((state) => state.fetchRate);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sharedCurrency !== currency) {
      void setSharedCurrency(currency);
    } else if (currency === "CDF" && rate === null) {
      void fetchRate();
    }
  }, [currency, fetchRate, rate, setSharedCurrency, sharedCurrency]);

  const select = useCallback(
    async (nextCurrency: CartCurrency) => {
      const target = resolveCartCurrency(nextCurrency);

      if (target === currency || isPending) return;

      const previous = currency;
      setCurrency(target);
      setIsPending(true);
      setError(null);

      try {
        await setSharedCurrency(target);
        if (target === "CDF" && rate === null) await fetchRate();
      } catch {
        // Rollback : l'UI ne doit jamais mentir sur la devise appliquée.
        setCurrency(previous);
        setError(CURRENCY_ERROR_MESSAGE);
      } finally {
        setIsPending(false);
      }
    },
    [currency, fetchRate, isPending, rate, setSharedCurrency],
  );

  return { currency, rate, isPending, error, select };
}
