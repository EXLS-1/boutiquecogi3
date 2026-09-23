// components/cart/cart-badge.tsx
// Badge du panier : compteur et libellés proviennent de la logique partagée
// (`lib/cart/cart-domain`), jamais d'un calcul local — le nombre affiché est
// donc toujours identique à celui de la page panier et du tunnel de paiement.
"use client";

import { useMounted } from "@/hooks/use-mounted";
import {
  formatCartBadgeCount,
  formatCartBadgeLabel,
} from "@/lib/cart/cart-domain";
import { useCartItemCount } from "@/store/use-cart";

export function CartBadge() {
  // Sélecteur dérivé du store : re-render uniquement si le nombre change.
  const totalQuantity = useCartItemCount();
  // Garde d'hydratation : le store persistant n'est lisible qu'après montage.
  const mounted = useMounted();

  if (!mounted || totalQuantity <= 0) return null;

  const label = formatCartBadgeLabel(totalQuantity);

  return (
    <div
      role="status"
      aria-label={label}
      title={label}
      className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-600 text-[11px] font-medium text-white animate-in fade-in zoom-in duration-300"
    >
      {formatCartBadgeCount(totalQuantity)}
    </div>
  );
}
