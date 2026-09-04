// constants/roles.ts
// ============================================================
// Constantes partagées de la gestion des rôles admin.
// Centralise routes, libellés, niveaux et messages pour
// éviter tout "hardcoding" dans les composants.
// ============================================================

export const ROLES_CONSTANTS = {
  ROUTES: {
    BASE: '/admin/roles',
    API: '/api/admin/roles',
  },

  // Niveaux hiérarchiques éditables (1 = SUPER_ADMIN et 7 = GUEST sont immuables).
  FORM_LEVELS: [
    { value: 2, label: '2 — Admin' },
    { value: 3, label: '3 — Manager' },
    { value: 4, label: '4 — Éditeur' },
    { value: 5, label: '5 — Superviseur' },
    { value: 6, label: '6 — Utilisateur' },
  ] as const,

  // Niveau par défaut proposé lors de la création.
  DEFAULT_LEVEL: 3,

  // Permissions activées par défaut lors de la création d'un rôle.
  DEFAULT_PERMISSION_CODES: ['role:view'] as const,

  MESSAGES: {
    CREATE_SUCCESS: 'Rôle créé avec succès.',
    UPDATE_SUCCESS: 'Rôle mis à jour avec succès.',
    PERMISSIONS_SUCCESS: 'Permissions du rôle mises à jour avec succès.',
    DELETE_SUCCESS: 'Rôle supprimé avec succès.',
    DELETE_CONFIRM: 'Confirmer la suppression de ce rôle ?',
    ERROR_GENERIC: 'Une erreur est survenue.',
  },
} as const;

export type RoleLevelOption = (typeof ROLES_CONSTANTS.FORM_LEVELS)[number];