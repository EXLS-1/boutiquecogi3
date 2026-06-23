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
  if (session?.user && items && items.length > 0) {
    const handleSync = async () => {
      const result = await syncCartAction(items);
      if (result.success) {
        console.log("Panier synchronisé avec succès");
      }
    };
    handleSync();
  }
  }, [session, items?.length ?? 0]);

  return null; // Ce composant ne fait aucun rendu
}