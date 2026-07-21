// components/navbar-secundo/navbar-secondary-actions.tsx
// Ce composant est dédié à l'affichage des actions de navigation dans la barre de navigation secondaire. Il est conçu pour être flexible et réutilisable, permettant d'ajouter n'importe quelle action (comme des boutons, des icônes, etc.) sans être limité à une icône spécifique.
// Contrairement à la version précédente, ce composant ne contient plus de logique spécifique à une icône de panier, ce qui le rend plus générique et adaptable à différents besoins d'interface utilisateur.

"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import Price from "@/components/product-price/price";
import { useCartStore } from "@/store/use-cart";

type NavbarActionsProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Conteneur de mise en page pour les actions de droite.
 * Ne contient pas de logique ni d'icône figée.
 */
export function NavbarActions({ children, className }: NavbarActionsProps) {
  const items = useCartStore((state) => state.items);
  const totalPrice = items.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {items.length > 0 && (
        <div className="hidden md:flex flex-col items-end mr-2">
          <span className="text-[10px] uppercase text-cyan-600 font-bold">Total Panier</span>
          <Price amount={totalPrice} currency="USD" size="sm" />
        </div>
      )}
      {children}
    </div>
  );
}