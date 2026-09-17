// components/cart/cart-badge.tsx
// Ce composant affiche un badge avec la quantité totale d'articles dans le panier.
// Il utilise Zustand pour accéder au panier global et
// calcule la quantité totale en sommant les quantités de chaque article.
// Le badge est affiché uniquement si la quantité totale est supérieure à zéro,
// et il est positionné de manière absolue pour se superposer à l'icône du panier.
"use client";

import { useCartStore } from "@/store/use-cart";
import { useMounted } from "@/hooks/use-mounted";

export function CartBadge() {
  const items = useCartStore((state) => state.items); // Accès aux articles du panier via Zustand
  const mounted = useMounted(); // Garde d'hydratation : le store client n'est lisible qu'après montage

  // Calcul de la quantité totale via la logique Zustand
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0); // Somme des quantités de chaque article pour obtenir la quantité totale

  if (!mounted || totalQuantity === 0) return null; // Ne pas afficher le badge tant que le store client n'est pas hydraté

  return (
    <div className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-600 text-[11px] font-medium text-white animate-in fade-in zoom-in duration-300">
      {totalQuantity}
    </div>
  );
}
