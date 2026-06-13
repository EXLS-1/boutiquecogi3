// store/use-network-store.ts
// Ce store gère l'état de la connexion réseau de l'utilisateur.
// Il permet à l'application de réagir dynamiquement (ex: désactiver le bouton "Payer")
// lorsque la connexion est perdue.

import { create } from "zustand";

interface NetworkState {
  isOnline: boolean;
  setOnline: (status: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  // Initialisation sécurisée pour le SSR (Server Side Rendering)
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,

  /**
   * Met à jour l'état de connexion.
   * @param status - true si en ligne, false sinon.
   */
  setOnline: (status: boolean) => set({ isOnline: status }),
}));

// Note: Ce store doit être couplé à des écouteurs 'online'/'offline' dans un layout ou provider.
