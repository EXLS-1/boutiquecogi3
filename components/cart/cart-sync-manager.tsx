// components/cart/cart-sync-manager.tsx
// Ce composant est responsable de synchroniser le panier local avec la base de données lorsque
// l'utilisateur se connecte ou modifie son panier.

"use client";

import { useEffect } from "react";
import { useSessionContext } from "@/lib/auth/auth-client";
import { useCartStore } from "@/store/use-cart";
import { syncCartAction } from "@/lib/actions/cart.actions";

export function CartSyncManager() {
  const { session } = useSessionContext();
  const items = useCartStore((state) => state.items);

  useEffect(() => {
    // Protection contre undefined + panier vide
    if (session?.user && items && items.length > 0) {
      const handleSync = async () => {
        try {
          // Mapper les items du store (CartItem[]) vers le format attendu par syncCartAction
          // qui valide via SyncCartSchema: { id, name, image, price, quantity }[]
          const cartData = items.map((item) => ({
            id: item.product.id,
            name: item.product.name,
            image: item.product.image,
            price: item.product.price,
            quantity: item.quantity,
          }));
          const result = await syncCartAction(cartData);
          if (result.success) {
            console.log("Panier synchronisé avec succès");
          }
        } catch (error) {
          console.error("Erreur synchronisation panier:", error);
        }
      };

      handleSync();
    }
  }, [session, items]);

  return null;
}