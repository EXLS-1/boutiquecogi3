// types/role.ts
// ============================================================
// Contrats de données pour la gestion des rôles admin.
// Reflètent la forme renvoyée par `RoleService.list()` :
// les rôles sont des `RoleDefinition` (base), avec leurs
// `RoleDefaultPermission` → `Permission` (code + nom).
// ============================================================

/** Référence d'une permission rattachée à un rôle. */
export interface RolePermissionRef {
  code: string;
  name: string;
}

/** Un rôle de la hiérarchie (RoleDefinition + permissions + nb d'utilisateurs). */
export interface Role {
  id: string;
  name: string | null;
  level: number;
  description: string | null;
  isActive: boolean;
  userCount: number;
  permissions: RolePermissionRef[];
}

/** Valeurs saisies dans le formulaire de création d'un rôle. */
export interface RoleFormValues {
  name: string;
  level: number;
  description: string;
  defaultPermissionCodes: string[];
  isActive: boolean;
}

/** Valeurs modifiables lors de l'édition d'un rôle (le nom/niveau sont immuables après création). */
export interface RoleUpdateValues {
  description?: string;
  isActive?: boolean;
  defaultPermissionCodes?: string[];
}