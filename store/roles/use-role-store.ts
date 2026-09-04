// store/roles/use-role-store.ts
// ============================================================
// État local UI (Zustand) pour les modales de gestion des rôles.
// Sépare la gestion d'affichage (modale ouverte/fermée, rôle sélectionné)
// de la logique métier placée dans les Server Actions.
// ============================================================

import { create } from 'zustand';
import type { Role } from '@/types/role';

interface RoleState {
  /** Modale création/édition. */
  isFormOpen: boolean;
  /** Modale matrice de permissions. */
  isPermissionsOpen: boolean;
  /** Modale de confirmation de suppression. */
  isDeleteOpen: boolean;
  /** Rôle sélectionné (non défini = création). */
  selectedRole: Role | null;

  openForm: (role?: Role) => void;
  closeForm: () => void;

  openPermissions: (role: Role) => void;
  closePermissions: () => void;

  openDelete: (role: Role) => void;
  closeDelete: () => void;
}

export const useRoleStore = create<RoleState>((set) => ({
  isFormOpen: false,
  isPermissionsOpen: false,
  isDeleteOpen: false,
  selectedRole: null,

  openForm: (role) =>
    set({ isFormOpen: true, isPermissionsOpen: false, isDeleteOpen: false, selectedRole: role ?? null }),
  closeForm: () => set({ isFormOpen: false, selectedRole: null }),

  openPermissions: (role) =>
    set({ isPermissionsOpen: true, isFormOpen: false, isDeleteOpen: false, selectedRole: role }),
  closePermissions: () => set({ isPermissionsOpen: false, selectedRole: null }),

  openDelete: (role) =>
    set({ isDeleteOpen: true, isFormOpen: false, isPermissionsOpen: false, selectedRole: role }),
  closeDelete: () => set({ isDeleteOpen: false, selectedRole: null }),
}));