// components/admin/admin-pin-session.tsx
"use client";

/**
 * Garde d'inactivité de la session PIN admin (monté par le layout /admin).
 *
 * - Le contenu n'est rendu ici QUE si le PIN a déjà été validé côté serveur
 *   (le layout n'embranche sur ce composant qu'après vérification du cookie).
 * - Après 5 min sans événement (touche, souris, clic, touch, scroll) :
 *   révocation de la session PIN (server action) puis `router.refresh()` →
 *   le layout serveur ré-affiche le gate. Le mécanisme est « fail-closed » :
 *   le contenu protégé n'est jamais simplement caché côté client, il est
 *   retiré par le serveur au refresh suivant.
 * - Filet de sécurité serveur : le cookie de session PIN expire de toute
 *   façon après 5 minutes (expiration vérifiée cryptographiquement), même si
 *   le timer client ne s'exécute pas (onglet en arrière-plan, JS ralenti).
 * - Restauration depuis le cache navigateur (bfcache, bouton « retour ») :
 *   `pageshow.persisted` déclenche un `router.refresh()` pour forcer une
 *   re-vérification serveur.
 */

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useInactivityTimer } from "@/hooks/use-inactivity-timer";
import { invalidatePinSessionAction } from "@/lib/pin/admin-pin-actions";

/* ------------------------------------------------------------------ */
/*  Constantes                                                         */
/* ------------------------------------------------------------------ */

const INACTIVITY_DELAY_MS = 5 * 60 * 1000; // 5 minutes

/* ------------------------------------------------------------------ */
/*  Composant                                                          */
/* ------------------------------------------------------------------ */

export function AdminPinSession({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleInactivity = useCallback(async () => {
    try {
      await invalidatePinSessionAction();
    } finally {
      // Dans tous les cas : re-render serveur → le layout décide (gate ou contenu).
      router.refresh();
    }
  }, [router]);

  useInactivityTimer(handleInactivity, INACTIVITY_DELAY_MS, true);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page restaurée depuis le bfcache sans requête serveur :
        // on force une re-vérification (le cookie a pu expirer entre-temps).
        router.refresh();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [router]);

  return <>{children}</>;
}
