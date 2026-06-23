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
    // Protection contre undefined + panier vide
    if (session?.user && items && items.length > 0) {
      const handleSync = async () => {
        try {
          const result = await syncCartAction(items);
          if (result.success) {
            console.log("Panier synchronisé avec succès");
          }
        } catch (error) {
          console.error("Erreur synchronisation panier:", error);
        }
      };

      handleSync();
    }
  }, [session, items?.length]); // ← Optional chaining ici aussi

  return null;
}