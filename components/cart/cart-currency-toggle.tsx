// components/cart/cart-currency-toggle.tsx
// Sélecteur de devise PARTAGÉ par la page panier et le tunnel de paiement :
// une seule mise en page, un seul comportement d'accessibilité (`aria-pressed`).
"use client";

import { Button } from "@/components/ui/button";
import type { CartCurrency } from "@/lib/cart/cart-domain";

/** Devises proposées à l'utilisateur (aligné sur l'enum Prisma `Currency`). */
const CART_CURRENCIES = ["USD", "CDF"] as const satisfies readonly CartCurrency[];

interface CartCurrencyToggleProps {
  /** Devise active (issue de `useCartCurrency`). */
  currency: CartCurrency;
  /** Écriture serveur en cours : blocage des boutons. */
  isPending?: boolean;
  /** Message d'erreur (rollback effectué) affiché sous le sélecteur. */
  error?: string | null;
  onSelect: (currency: CartCurrency) => void;
  className?: string;
}

export function CartCurrencyToggle({
  currency,
  isPending = false,
  error = null,
  onSelect,
  className,
}: CartCurrencyToggleProps) {
  return (
    <div className={className}>
      <div
        role="group"
        aria-label="Devise d'affichage"
        className="flex justify-end gap-2"
      >
        {CART_CURRENCIES.map((code) => {
          const isActive = currency === code;

          return (
            <Button
              key={code}
              type="button"
              variant={isActive ? "default" : "outline"}
              onClick={() => onSelect(code)}
              disabled={isPending}
              aria-pressed={isActive}
            >
              {code}
            </Button>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-right text-xs text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}