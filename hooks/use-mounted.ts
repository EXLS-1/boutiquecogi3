// hooks/use-mounted.ts
"use client";

import { useSyncExternalStore } from "react";

/**
 * Hook `useMounted` — garde d'hydratation côté client.
 *
 * Retourne `false` pendant le rendu serveur ET pendant le premier rendu client
 * (snapshot serveur), puis `true` une fois l'hydratation terminée. Permet de
 * n'afficher qu'après hydratation un contenu dépendant d'un store client
 * (Zustand, localStorage…) sans provoquer de mismatch SSR.
 *
 * Implémentation via `useSyncExternalStore`, l'API recommandée par React pour
 * lire un état externe : elle évite le pattern `useState` + `useEffect(() =>
 * setMounted(true))` qui déclenche des rendus en cascade et est désormais
 * interdit par ESLint (`react-hooks/set-state-in-effect`).
 *
 * @example
 * const mounted = useMounted();
 * if (!mounted) return null; // contenu dépendant du client
 */

/** Aucune source externe à observer : abonnement inerte (référence stable). */
function subscribe(): () => void {
  return () => {};
}

/** Snapshot navigateur : le composant est monté. */
function getClientSnapshot(): boolean {
  return true;
}

/** Snapshot serveur / pré-hydratation : considéré comme non monté. */
function getServerSnapshot(): boolean {
  return false;
}

export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
