// stores/rbac-store.ts
/**
 * Expliquer en detail ce que fait ce fichier
 */

import { create } from "zustand";
import { Permission, RoleLevel, RBACSession } from "@/types/rbac";

interface RBACState {
  session: RBACSession | null;
  isLoading: boolean;

  // Actions
  setSession: (session: RBACSession | null) => void;
  setLoading: (loading: boolean) => void;

  // Méthodes de vérification (utilisées par useRBAC)
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
}

export const useRBACStore = create<RBACState>((set, get) => ({
  session: null,
  isLoading: true,

  setSession: (session) => set({ session, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),

  hasPermission: (permission: Permission) => {
    const { session } = get();
    if (!session?.isAuthenticated || !session.effectivePermissions)
      return false;
    return session.effectivePermissions.has(permission);
  },

  hasAnyPermission: (permissions: Permission[]) => {
    const { session } = get();
    if (!session?.isAuthenticated || !session.effectivePermissions)
      return false;
    return permissions.some((p) => session.effectivePermissions.has(p));
  },

  hasAllPermissions: (permissions: Permission[]) => {
    const { session } = get();
    if (!session?.isAuthenticated || !session.effectivePermissions)
      return false;
    return permissions.every((p) => session.effectivePermissions.has(p));
  },
}));

/**
 * Sélecteur optimisé pour récupérer uniquement l'état de chargement
 */
export const useRBACLoading = () => useRBACStore((state) => state.isLoading);

/**
 * Sélecteur pour récupérer la session actuelle
 */
export const useRBACSession = () => useRBACStore((state) => state.session);
