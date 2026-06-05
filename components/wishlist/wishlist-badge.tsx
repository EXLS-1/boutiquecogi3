// components/wishlist/wishlist-badge.tsx
// Ce composant React, `WishlistBadge`, affiche un badge avec le nombre total d'articles dans la liste de souhaits de l'utilisateur.
// Le badge est stylisé avec Tailwind CSS et inclut une icône de `lucide-react`.
// Il utilise le hook `useWishlist` pour accéder au nombre total d'articles et met à jour le badge en conséquence.
// Le composant est rendu uniquement côté client pour éviter les problèmes d'hydratation avec le rendu côté serveur.
// Il est conçu pour être réutilisable dans toute l'application, offrant un moyen cohérent d'afficher le compte de la liste de souhaits.

"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useWishlist } from "@/store/use-wishlist";
import Link from "next/link";
import { cn } from "@/lib/utils/utils";

export function WishlistBadge() {
  const [mounted, setMounted] = useState(false);
  const totalItems = useWishlist((state) => state.totalItems);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return (
    <div className="p-2">
      <Heart className="h-6 w-6 text-cyan-700" />
    </div>
  );

  return (
    <Link 
      href="/wishlist" 
      className="relative flex items-center justify-center p-2 rounded-full transition-all duration-200 hover:bg-rose-50 group"
      aria-label="Voir mes favoris"
    >
      <Heart 
        className={cn(
          "h-6 w-6 transition-all duration-300 group-hover:scale-110",
          totalItems > 0 ? "text-rose-500 fill-rose-500" : "text-cyan-700 group-hover:text-rose-500"
        )} 
      />
      {totalItems > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-sm ring-2 ring-white animate-in zoom-in duration-300">
          {totalItems}
        </span>
      )}
    </Link>
  );
}