// app/actions/wishlist-sync-manager.tsx
// This file defines a React component called `WishlistSyncManager` that is responsible for synchronizing the user's local wishlist with the wishlist stored in the database. It uses the `useSession` hook from the authentication client to access the current user's session and the `useWishlist` hook to access the local wishlist items. When the component detects that a user is authenticated and there are items in the local wishlist, it calls the `syncWishlistAction` server action to perform the synchronization. This component is intended to be used in a layout or a high-level component to ensure that the synchronization process is triggered whenever there are changes to the user's session or the local wishlist.
// Ce fichier définit un composant React appelé `WishlistSyncManager` qui est responsable de synchroniser la liste de souhaits locale de l'utilisateur avec celle stockée dans la base de données. Il utilise le hook `useSession` du client d'authentification pour accéder à la session actuelle de l'utilisateur et le hook `useWishlist` pour accéder aux éléments de la liste de souhaits locale. Lorsque le composant détecte qu'un utilisateur est authentifié et qu'il y a des éléments dans la liste de souhaits locale, il appelle l'action serveur `syncWishlistAction` pour effectuer la synchronisation. Ce composant est destiné à être utilisé dans une mise en page ou un composant de haut niveau pour garantir que le processus de synchronisation est déclenché chaque fois qu'il y a des changements dans la session de l'utilisateur ou la liste de souhaits locale.
// This component ensures that the user's wishlist remains consistent across different sessions and devices by merging the local wishlist with the database wishlist whenever the user logs in or updates their local wishlist. The synchronization process is handled on the server side to ensure data integrity and to avoid issues with concurrent updates from multiple devices.
// Ce composant garantit que la liste de souhaits de l'utilisateur reste cohérente sur différentes sessions et appareils en fusionnant la liste de souhaits locale avec celle de la base de données chaque fois que l'utilisateur se connecte ou met à jour sa liste de souhaits locale. Le processus de synchronisation est géré côté serveur pour garantir l'intégrité des données et éviter les problèmes liés aux mises à jour concurrentes depuis plusieurs appareils.

"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { useWishlist } from "@/store/use-wishlist";
import { syncWishlistAction } from "@/app/actions/wishlist.actions";

export function WishlistSyncManager() {
  const { data: session } = authClient.useSession();
  const { items } = useWishlist();

  useEffect(() => {
    if (session?.user && items.length > 0) {
      const handleSync = async () => {
        const result = await syncWishlistAction(items);
        if (result.success) {
          console.log("Wishlist synchronisée");
        }
      };
      handleSync();
    }
  }, [session, items.length]);

  return null;
}