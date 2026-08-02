// hooks/rbac/use-rbac.ts
// Hook global RBAC - HIÉRARCHIE DESCENDANTE
// Level 1 = SUPER_ADMIN (plus haut) → Level 7 = GUEST (plus bas)

"use client";

import { useCallback, useMemo } from "react";
import { useRBACStore } from "@/store/use-rbac-store";
import { Permission, Role, getRoleLevel } from "@/lib/auth/rbac-shared";

type RoleLevel = ReturnType<typeof getRoleLevel>;


interface RBACRestriction {
  restrictedToOwn: boolean;
  conditions: Record<string, unknown> | null;
}

interface PermissionToggle {
  permission: Permission;
  restrictedToOwn?: boolean;
  conditions?: Record<string, unknown>;
  [key: string]: unknown;
}

interface UseRBACReturn {
  // État
  role: Role | null;
  level: RoleLevel | null;
  permissions: Permission[];
  isLoading: boolean;
  isAuthenticated: boolean;

  // Vérifications de niveau (hiérarchie descendante)
  // Level 1 = plus haut, Level 7 = plus bas
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;

  // Comparaison de niveaux
  isAboveLevel: (targetLevel: RoleLevel) => boolean;      // userLevel < targetLevel (plus haut)
  isAtLeastLevel: (targetLevel: RoleLevel) => boolean;    // userLevel <= targetLevel (plus haut ou égal)
  isAtMostLevel: (targetLevel: RoleLevel) => boolean;       // userLevel >= targetLevel (plus bas ou égal)
  isExactlyLevel: (exactLevel: RoleLevel) => boolean;
  isBelowLevel: (targetLevel: RoleLevel) => boolean;       // userLevel > targetLevel (plus bas)

  // Métadonnées
  getRestriction: (permission: Permission) => RBACRestriction | null;
  getPermissionToggle: (permission: Permission) => PermissionToggle | null;
  getRoleColor: () => string;
  getRoleName: () => string;

  // Hiérarchie
  canModifyUser: (targetUserLevel: RoleLevel) => boolean;   // peut modifier si userLevel < targetUserLevel
  canAssignRole: (targetRoleLevel: RoleLevel) => boolean;        // peut assigner si userLevel < targetRoleLevel
  canAccess: (requiredPermissions: Permission[], requireAll?: boolean) => boolean;
}

export function useRBAC(): UseRBACReturn {
  const store = useRBACStore();
  const { session, isLoading } = store;

  // RBACSession may not expose role/level directly in typings; safely fallback to possible shapes
  const role = (session as unknown as { role?: Role; user?: { role?: Role } } | null)?.role ??
    (session as unknown as { user?: { role?: Role } } | null)?.user?.role ?? null;
  const level =
    (session as unknown as { level?: RoleLevel; user?: { level?: RoleLevel } } | null)?.level ??
      (session as unknown as { user?: { level?: RoleLevel } } | null)?.user?.level ?? null;

  const permissions = useMemo(() => 
    Array.from(session?.effectivePermissions || []),
    [session?.effectivePermissions]
  );

  const hasPermission = useCallback((permission: Permission): boolean => {
    return store.hasPermission(permission);
  }, [store]);

  const hasAnyPermission = useCallback((perms: Permission[]): boolean => {
    return store.hasAnyPermission(perms);
  }, [store]);

  const hasAllPermissions = useCallback((perms: Permission[]): boolean => {
    return store.hasAllPermissions(perms);
  }, [store]);

  // userLevel < targetLevel → plus haut dans la hiérarchie
  const isAboveLevel = useCallback((targetLevel: RoleLevel): boolean => {
    if (!level) return false;
    return level < targetLevel;
  }, [level]);

  // userLevel <= targetLevel → plus haut ou égal
  const isAtLeastLevel = useCallback((targetLevel: RoleLevel): boolean => {
    if (!level) return false;
    return level <= targetLevel;
  }, [level]);

  // userLevel >= targetLevel → plus bas ou égal
  const isAtMostLevel = useCallback((targetLevel: RoleLevel): boolean => {
    if (!level) return false;
    return level >= targetLevel;
  }, [level]);

  const isExactlyLevel = useCallback((exactLevel: RoleLevel): boolean => {
    return level === exactLevel;
  }, [level]);

  // userLevel > targetLevel → plus bas
  const isBelowLevel = useCallback((targetLevel: RoleLevel): boolean => {
    if (!level) return false;
    return level > targetLevel;
  }, [level]);

  const getRestriction = useCallback(
    (permission: Permission): RBACRestriction | null => {
      if (!role) return null;

      type RolePermissionToggle = {
        permission: Permission;
        restrictedToOwn?: boolean;
        conditions?: Record<string, unknown>;
      };

      const perms = (role as unknown as {
        permissions?: RolePermissionToggle[];
      })?.permissions;

      const toggle = perms?.find((p) => p.permission === permission);
      if (!toggle) return null;

      return {
        restrictedToOwn: !!toggle.restrictedToOwn,
        conditions: toggle.conditions || null,
      };
    },
    [role],
  );

  // Return safe typed data for permission toggles
  // (Runtime shape comes from RBAC role config; typings for Role may be incomplete.)
  const getPermissionToggle = useCallback(
    (permission: Permission): PermissionToggle | null => {
      if (!role) return null;

      type RolePermissionToggle = {
        permission: Permission;
        restrictedToOwn?: boolean;
        conditions?: Record<string, unknown>;
      };

      const perms = (role as unknown as {
        permissions?: RolePermissionToggle[];
      })?.permissions;
      return perms?.find((p) => p.permission === permission) ?? null;
    },
    [role],
  );





  const getRoleColor = useCallback((): string => {
    // Role type is a string union; mapping color is handled by UI if needed.
    // Default fallback keeps hook stable.
    return "#6b7280";
  }, []);

  const getRoleName = useCallback((): string => {
    return role ?? "Invité";
  }, [role]);


  // Un utilisateur ne peut modifier que des utilisateurs de niveau STRICTEMENT INFÉRIEUR
  // (plus grand numériquement = plus bas dans la hiérarchie)
  const canModifyUser = useCallback((targetUserLevel: RoleLevel): boolean => {
    if (!level) return false;
    return level < targetUserLevel;
  }, [level]);

  // Ne peut assigner que des rôles de niveau STRICTEMENT INFÉRIEUR au sien
  const canAssignRole = useCallback((targetRoleLevel: RoleLevel): boolean => {
    if (!level) return false;
    return level < targetRoleLevel;
  }, [level]);

  const canAccess = useCallback((requiredPermissions: Permission[], requireAll = true): boolean => {
    if (!session?.isAuthenticated) return false;
    if (requiredPermissions.length === 0) return true;

    return requireAll
      ? requiredPermissions.every(p => Boolean(session?.effectivePermissions?.has(p)))
      : requiredPermissions.some(p => Boolean(session?.effectivePermissions?.has(p)));
  }, [session]);

  return useMemo(() => ({
    role,
    level,
    permissions,
    isLoading,
    isAuthenticated: !!session?.isAuthenticated,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAboveLevel,
    isAtLeastLevel,
    isAtMostLevel,
    isExactlyLevel,
    isBelowLevel,
    getRestriction,
    getPermissionToggle,
    getRoleColor,
    getRoleName,
    canModifyUser,
    canAssignRole,
    canAccess,
  }), [
    role, level, permissions, isLoading, session?.isAuthenticated,
    hasPermission, hasAnyPermission, hasAllPermissions,
    isAboveLevel, isAtLeastLevel, isAtMostLevel, isExactlyLevel, isBelowLevel,
    getRestriction, getPermissionToggle, getRoleColor, getRoleName,
    canModifyUser, canAssignRole, canAccess,
  ]);
}
