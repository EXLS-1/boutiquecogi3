// components/cart/cart-sync-manager.tsx
// Ce composant est responsable de synchroniser le panier local avec la base de données lorsque l'utilisateur se connecte ou modifie son panier.
"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth/auth-client";
import useCart from "@/store/use-cart";
import { syncCartAction } from "@/lib/actions/cart.actions";

export function CartSyncManager() {
  const { data: session } = authClient.useSession();
  const { items } = useCart();

  useEffect(() => {
    // On ne synchronise que si l'utilisateur est connecté et que le panier n'est pas vide
    if (session?.user && items.length > 0) {
      const handleSync = async () => {
        const result = await syncCartAction(items);
        if (result.success) {
          console.log("Panier synchronisé avec succès");
        }
      };

      handleSync();
    }
  }, [session, items.length]); // Déclenché lors du login ou ajout au panier

  return null; // Ce composant ne fait aucun rendu
}