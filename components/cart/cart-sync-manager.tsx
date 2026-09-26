// components/cart/cart-sync-manager.tsx
/**
 * Synchronise le panier local (localStorage / Zustand) avec le panier serveur.
 *
 * Robustesse (source unique : `lib/cart/cart-domain`) :
 *  - la charge utile est normalisée (ids/quantités/prix bornés, doublons
 *    fusionnés) : le schéma Zod de `syncCartAction` ne peut plus être violé ;
 *  - déduplication par signature : un panier inchangé ne déclenche AUCUNE
 *    requête réseau (avant : une requête à chaque re-render) ;
 *  - debounce : les clics répétés sur « + » produisent une seule requête ;
 *  - anti-course : une réponse obsolète est ignorée (`requestId`) ;
 *  - le changement de compte réinitialise l'état de synchronisation (aucune
 *    fuite du panier d'un utilisateur vers un autre).
 */

"use client";

import { useEffect, useRef } from "react";
import { syncCartAction } from "@/lib/actions/cart.actions";
import { useSessionContext } from "@/lib/auth/auth-client";
import {
  buildCartSyncPayload,
  cartItemsSignature,
} from "@/lib/cart/cart-domain";
import { useCartStore } from "@/store/use-cart";

/** Délai d'inactivité avant envoi (regroupe les modifications rapprochées). */
const SYNC_DEBOUNCE_MS = 800;

export function CartSyncManager() {
  const { session } = useSessionContext();
  const items = useCartStore((state) => state.items);
  const userId = session?.user?.id ?? null;

  /** Dernière signature synchronisée (par utilisateur). */
  const lastSyncedRef = useRef<{ userId: string | null; signature: string }>({
    userId: null,
    signature: "",
  });
  /** Identifiant de la requête courante : ignore les réponses obsolètes. */
  const requestIdRef = useRef(0);

  useEffect(() => {
    // Déconnexion : on oublie l'état du compte précédent.
    if (!userId) {
      requestIdRef.current += 1;
      lastSyncedRef.current = { userId: null, signature: "" };
      return;
    }

    const signature = cartItemsSignature(items);

    const lastSynced = lastSyncedRef.current;
    if (lastSynced.userId === userId && lastSynced.signature === signature) {
      return; // Déjà synchronisé : aucune requête
    }

    // Panier vide (signature "") : on envoie un payload vide pour vider le
    // panier serveur au lieu de le laisser orphelin (sinon `clearCart` local
    // ne serait jamais propagé et le serveur garderait les anciennes lignes).
    const payload = buildCartSyncPayload(items);

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const result = await syncCartAction(payload);

          // Une modification plus récente a pris la main : on abandonne.
          if (requestIdRef.current !== requestId) return;

          if (result.success) {
            lastSyncedRef.current = { userId, signature };
            return;
          }

          console.warn("[CartSync] Synchronisation refusée:", result.error);
        } catch (error) {
          if (requestIdRef.current === requestId) {
            console.error("[CartSync] Erreur de synchronisation:", error);
          }
        }
      })();
    }, SYNC_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [items, userId]);

  return null;
}