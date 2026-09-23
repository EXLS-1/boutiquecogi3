// components/cart/checkout-cart-state.tsx
/**
 * Composants client partagés par les pages de retour du tunnel de paiement.
 *
 * Les Server Components (`app/checkout/success`, `app/checkout/cancel`) ne
 * peuvent pas lire le panier localStorage : ces deux composants appliquent la
 * MÊME logique de panier (`lib/cart/cart-domain`) que la page panier et le
 * checkout, sans dupliquer de calcul.
 */
"use client";

import { useEffect, useRef } from "react";
import {
  buildCartSummary,
  formatCartAmount,
  formatCartItemCount,
  type CartCurrency,
} from "@/lib/cart/cart-domain";
import { useMounted } from "@/hooks/use-mounted";
import useCart from "@/store/use-cart";

/**
 * Vide le panier local après la création de la commande.
 *
 * La commande est persistée AVANT la redirection CinetPay
 * (`createOrderFromCart`) : conserver le panier local produirait un doublon de
 * commande au retour. L'opération est idempotente (gardée par `useRef`) et sans
 * effet visible si le panier est déjà vide.
 */
export function CheckoutSuccessCartReset() {
  const clearCart = useCart((state) => state.clearCart);
  const hasResetRef = useRef(false);

  useEffect(() => {
    if (hasResetRef.current) return;

    hasResetRef.current = true;
    clearCart();
  }, [clearCart]);

  return null;
}

interface CheckoutCartPreservedNoticeProps {
  /** Devise d'affichage résolue côté serveur (cookie `displayCurrency`). */
  currency?: CartCurrency;
}

/**
 * Rappel « votre panier est conservé » de la page d'annulation : affiche le
 * nombre d'articles et le total estimé via la logique partagée.
 */
export function CheckoutCartPreservedNotice({
  currency = "USD",
}: CheckoutCartPreservedNoticeProps) {
  const items = useCart((state) => state.items);
  const mounted = useMounted();

  // Garde d'hydratation : le panier persistant n'existe pas côté serveur.
  if (!mounted) return null;

  const summary = buildCartSummary(items, currency);
  if (summary.totalQuantity === 0) return null;

  return (
    <p className="mb-8 text-sm text-zinc-500">
      {formatCartItemCount(summary.totalQuantity)} conservé
      {summary.totalQuantity > 1 ? "s" : ""} — total estimé{" "}
      <span className="font-medium text-zinc-700">
        {formatCartAmount(summary.total, summary.currency)}
      </span>
    </p>
  );
}