// store/use-rbac-store.ts
// Gestion de l'état global RBAC avec Zustand
// Permet de gérer les permissions de l'utilisateur
// Invalidate le cache RBAC au login et logout

import { create } from "zustand";
import type { Permission, Role } from "@/lib/auth/rbac-shared";

interface RBACUserData {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: Role;
}

interface RBACSession {
  isAuthenticated: boolean;
  effectivePermissions: Set<Permission> | null;
  user: RBACUserData;
  role: Role;
  level: number;
}

interface RBACState {
  session: RBACSession | null;
  isLoading: boolean;

  // Actions
  setSession: (session: RBACSession | null) => void;
  setLoading: (loading: boolean) => void;
  invalidateCache: () => void;

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
  invalidateCache: () => set({ session: null }),

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
    const perms = session.effectivePermissions;
    return permissions.some((p) => perms.has(p));
  },

  hasAllPermissions: (permissions: Permission[]) => {
    const { session } = get();
    if (!session?.isAuthenticated || !session.effectivePermissions)
      return false;
    const perms = session.effectivePermissions;
    return permissions.every((p) => perms.has(p));
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
