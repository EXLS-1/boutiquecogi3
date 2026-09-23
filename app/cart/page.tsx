// app/cart/page.tsx
// Page panier : entièrement alimentée par la logique partagée
// (`lib/cart/cart-domain`) — normalisation, prix par devise, stock, total,
// anomalies et libellés proviennent de la même source que le checkout.
"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { CartCurrencyToggle } from "@/components/cart/cart-currency-toggle";
import { Button } from "@/components/ui/button";
import { useCartCurrency } from "@/hooks/use-cart-currency";
import { useMounted } from "@/hooks/use-mounted";
import {
  CART_IMAGE_FALLBACK,
  CART_ISSUE_LABELS,
  CART_LABELS,
  CART_ROUTES,
  buildCartSummary,
  formatCartAmount,
  formatCartItemCount,
  getCartLineMaxQuantity,
} from "@/lib/cart/cart-domain";
import useCart from "@/store/use-cart";

export default function CartPage() {
  // Actions du store : sélecteurs stables (aucun re-render inutile).
  const items = useCart((state) => state.items);
  const updateQuantity = useCart((state) => state.updateQuantity);
  const removeItem = useCart((state) => state.removeItem);
  const clearCart = useCart((state) => state.clearCart);

  // Devise d'affichage partagée avec le tunnel de paiement.
  const { currency, isPending, error, select } = useCartCurrency();
  // Garde d'hydratation : le panier persistant n'existe pas côté serveur.
  const mounted = useMounted();

  // 1. Normalisation unique : lignes payables, anomalies, total, devise.
  const summary = useMemo(
    () => buildCartSummary(items, currency),
    [items, currency],
  );

  // 2. Borne de quantité par produit (borne globale ET stock disponible).
  const maxQuantityById = useMemo(() => {
    const limits = new Map<string, number>();

    for (const item of items) {
      const stock =
        typeof item?.product?.stock === "number" ? item.product.stock : null;
      limits.set(item.product.id, getCartLineMaxQuantity(stock));
    }

    return limits;
  }, [items]);

  // Garde d'hydratation : le panier localStorage n'est lisible qu'après montage.
  if (!mounted) {
    return (
      <div
        className="container mx-auto max-w-4xl px-4 py-8"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="h-9 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 space-y-4">
          <div className="h-24 w-full animate-pulse rounded-xl bg-slate-100" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (summary.lines.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center">
        <h1 className="font-playfair text-3xl font-bold mb-6 tracking-widest uppercase text-cyan-400">
          {CART_LABELS.pageTitle}
        </h1>
        <p className="font-lato text-cyan-400 text-lg">{CART_LABELS.empty}</p>
        <Link
          href={CART_ROUTES.products}
          className="mt-6 inline-block bg-cyan-400 border-round-md text-white font-bold py-2 px-4 rounded hover:bg-cyan-600 transition-colors"
        >
          {CART_LABELS.backToShop}
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-playfair text-3xl font-bold tracking-widest uppercase text-cyan-400">
          {CART_LABELS.pageTitle}
        </h1>

        {/* Devise partagée avec le checkout : les prix envoyés suivent ce choix. */}
        <CartCurrencyToggle
          currency={currency}
          isPending={isPending}
          error={error}
          onSelect={select}
        />
      </div>

      {/* Transparence : articles écartés ou quantités ajustées au stock. */}
      {summary.issues.length > 0 && (
        <div
          role="status"
          className="mb-6 rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800"
        >
          <p className="mb-1 font-medium">
            Certains articles ne sont pas payables en l&apos;état :
          </p>
          <ul className="list-inside list-disc">
            {summary.issues.map((issue, index) => (
              <li key={`${issue.id}-${issue.reason}-${index}`}>
                {issue.name} — {CART_ISSUE_LABELS[issue.reason]}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        {summary.lines.map((line) => (
          <div
            key={line.id}
            className="flex flex-col sm:flex-row items-center justify-between border border-slate-200 rounded-xl p-4 bg-white shadow-sm"
          >
            {/* Informations Produit */}
            <div className="flex items-center space-x-6 w-full sm:w-auto">
              <div className="relative w-20 h-20 overflow-hidden rounded-sm border border-slate-200">
                <Image
                  src={line.image || CART_IMAGE_FALLBACK}
                  alt={line.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
              <div>
                <h2 className="font-playfair text-xl font-bold text-slate-950">
                  {line.name}
                </h2>
                <p className="font-lato font-bold text-cyan-400 mt-1">
                  {formatCartAmount(line.price, summary.currency)}
                </p>
                <p className="font-lato text-xs text-slate-500">
                  {formatCartAmount(line.price * line.quantity, summary.currency)}{" "}
                  au total
                </p>
              </div>
            </div>

            {/* Contrôles et Actions */}
            <div className="flex items-center space-x-6 mt-4 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
              {/* Contrôle des quantités */}
              <div className="flex items-center gap-x-4 border border-slate-200 rounded-sm px-2 py-1 bg-slate-50">
                <button
                  type="button"
                  onClick={() => updateQuantity(line.id, line.quantity - 1)}
                  disabled={line.quantity <= 1}
                  className="p-1 text-slate-500 hover:text-rose-500 disabled:opacity-50 transition-colors focus:outline-none"
                  aria-label={`Diminuer la quantité de ${line.name}`}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-lato font-bold w-6 text-center text-cyan-500">
                  {line.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(line.id, line.quantity + 1)}
                  disabled={
                    line.quantity >=
                    (maxQuantityById.get(line.id) ?? getCartLineMaxQuantity(null))
                  }
                  className="p-1 text-cyan-500 hover:text-rose-500 disabled:opacity-50 transition-colors focus:outline-none"
                  aria-label={`Augmenter la quantité de ${line.name}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Suppression */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(line.id)}
                className="text-cyan-500 hover:text-rose-500 hover:bg-rose-500/10"
                aria-label={`Supprimer ${line.name} du panier`}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        ))}

        {/* Section Récapitulatif — total et libellés issus du domaine partagé. */}
        <div className="flex flex-col gap-6 border-t border-slate-200 pt-6 mt-10 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="outline"
            onClick={clearCart}
            className="border-cyan-400 text-cyan-400 hover:bg-rose-500 hover:border-rose-500 hover:text-white font-bold tracking-widest uppercase transition-all w-full sm:w-auto"
          >
            {CART_LABELS.clearCart}
          </Button>

          <div className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-6 py-4 shadow-sm sm:w-auto">
            <span className="font-lato text-sm font-bold uppercase tracking-wider text-slate-500">
              {CART_LABELS.total} ({formatCartItemCount(summary.totalQuantity)})
            </span>
            <span className="font-playfair text-2xl font-bold text-cyan-400">
              {formatCartAmount(summary.total, summary.currency)}
            </span>
          </div>

          {/* Seul chemin vers le paiement : même total que le tunnel de paiement. */}
          <Button
            asChild
            disabled={!summary.isPayable}
            className="bg-cyan-500 hover:bg-rose-500 text-white font-bold tracking-widest uppercase transition-all w-full sm:w-auto"
          >
            <Link href={CART_ROUTES.checkout} className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              {CART_LABELS.checkout}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
