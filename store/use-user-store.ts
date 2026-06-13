// store/use-user-store.ts
// Stocke les informations de l'utilisateur connecté pour un accès rapide côté client.
// Utilise la persistance (localStorage) pour conserver les préférences entre les sessions.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UserProfile {
  id: string; // Identifiant UUID v7
  name: string;
  email: string;
  image?: string | null;
  role?: string;
  // Ajoutez ici des champs spécifiques à Boutique COGI (ex: téléphone, adresse par défaut)
}

interface UserState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  setUser: (user: UserProfile | null) => void;
  updateUser: (data: Partial<UserProfile>) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),

      clearUser: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "cogi-user-storage", // Nom de la clé dans le localStorage
      storage: createJSONStorage(() => localStorage),
      // On ne persiste que les données nécessaires, le token est géré par Better-Auth (Cookies)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
