// components/cart/cart-badge.tsx
// Ce composant affiche un badge avec la quantité totale d'articles dans le panier.
// Il utilise Zustand pour accéder au panier global et
// calcule la quantité totale en sommant les quantités de chaque article.
// Le badge est affiché uniquement si la quantité totale est supérieure à zéro,
// et il est positionné de manière absolue pour se superposer à l'icône du panier.
"use client";

import useCart from "@/store/use-cart";
import { useEffect, useState } from "react";

export function CartBadge() {
  const items = useCart((state) => state.items); // Accès aux articles du panier via Zustand
  const [mounted, setMounted] = useState(false); // État pour gérer l'hydratation côté client

  // Calcul de la quantité totale via la logique Zustand
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0); // Somme des quantités de chaque article pour obtenir la quantité totale

  // Hydratation sécurisée pour éviter les mismatches avec le SSR
  useEffect(() => {
    setMounted(true); // Marque le composant comme monté une fois que le composant est rendu côté client
  }, []);

  if (!mounted || totalQuantity === 0) return null; // Ne pas afficher le badge si le composant n'est pas monté ou si la quantité totale est zéro

  return (
    <div className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-600 text-[11px] font-medium text-white animate-in fade-in zoom-in duration-300">
      {totalQuantity}
    </div>
  );
}
