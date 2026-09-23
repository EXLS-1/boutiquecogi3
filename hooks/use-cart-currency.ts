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

import { useCallback, useState } from "react";
import { setDisplayCurrency } from "@/lib/actions/currency.actions";
import {
  resolveCartCurrency,
  type CartCurrency,
} from "@/lib/cart/cart-domain";

export interface CartCurrencyState {
  /** Devise active (une seule source de vérité côté client). */
  currency: CartCurrency;
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
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const select = useCallback(
    async (nextCurrency: CartCurrency) => {
      const target = resolveCartCurrency(nextCurrency);

      if (target === currency || isPending) return;

      const previous = currency;
      setCurrency(target);
      setIsPending(true);
      setError(null);

      try {
        await setDisplayCurrency(target);
      } catch {
        // Rollback : l'UI ne doit jamais mentir sur la devise appliquée.
        setCurrency(previous);
        setError(CURRENCY_ERROR_MESSAGE);
      } finally {
        setIsPending(false);
      }
    },
    [currency, isPending],
  );

  return { currency, isPending, error, select };
}
