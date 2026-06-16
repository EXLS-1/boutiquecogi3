// hooks/rbac/use-rbac.ts
// ============================================================
// 1. useRBAC - Hook global de permissions
// ============================================================

"use client";

import { useCallback, useMemo } from "react";
import { useRBACStore } from "@/stores/rbac-store";
import { Permission, RoleLevel, PermissionToggle, Role } from "@/types/rbac";

interface RBACRestriction {
  restrictedToOwn: boolean;
  conditions: Record<string, unknown> | null;
}

interface UseRBACReturn {
  // État
  role: Role | null;
  level: RoleLevel | null;
  permissions: Permission[];
  isLoading: boolean;
  isAuthenticated: boolean;

  // Vérifications
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  isAboveLevel: (targetLevel: RoleLevel) => boolean;
  isAtLeastLevel: (minLevel: RoleLevel) => boolean;
  isExactlyLevel: (exactLevel: RoleLevel) => boolean;

  // Métadonnées
  getRestriction: (permission: Permission) => RBACRestriction | null;
  getPermissionToggle: (permission: Permission) => PermissionToggle | null;
  getRoleColor: () => string;
  getRoleName: () => string;

  // Hiérarchie
  canModifyUser: (targetUserLevel: RoleLevel) => boolean;
  canAssignRole: (roleLevel: RoleLevel) => boolean;
}

export function useRBAC(): UseRBACReturn {
  const store = useRBACStore();
  const { session, isLoading } = store;

  const role = session?.role || null;
  const level = session?.level || null;
  const permissions = useMemo(
    () => Array.from(session?.effectivePermissions || []),
    [session?.effectivePermissions],
  );

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      return store.hasPermission(permission);
    },
    [store],
  );

  const hasAnyPermission = useCallback(
    (perms: Permission[]): boolean => {
      return store.hasAnyPermission(perms);
    },
    [store],
  );

  const hasAllPermissions = useCallback(
    (perms: Permission[]): boolean => {
      return store.hasAllPermissions(perms);
    },
    [store],
  );

  const isAboveLevel = useCallback(
    (targetLevel: RoleLevel): boolean => {
      if (!level) return false;
      return level > targetLevel;
    },
    [level],
  );

  const isAtLeastLevel = useCallback(
    (minLevel: RoleLevel): boolean => {
      if (!level) return false;
      return level >= minLevel;
    },
    [level],
  );

  const isExactlyLevel = useCallback(
    (exactLevel: RoleLevel): boolean => {
      return level === exactLevel;
    },
    [level],
  );

  const getRestriction = useCallback(
    (permission: Permission): RBACRestriction | null => {
      if (!role) return null;
      const toggle = role.permissions.find((p) => p.permission === permission);
      if (!toggle) return null;
      return {
        restrictedToOwn: toggle.restrictedToOwn || false,
        conditions: toggle.conditions || null,
      };
    },
    [role],
  );

  const getPermissionToggle = useCallback(
    (permission: Permission): PermissionToggle | null => {
      if (!role) return null;
      return role.permissions.find((p) => p.permission === permission) || null;
    },
    [role],
  );

  const getRoleColor = useCallback((): string => {
    return role?.color || "#6b7280";
  }, [role]);

  const getRoleName = useCallback((): string => {
    return role?.name || "Invité";
  }, [role]);

  const canModifyUser = useCallback(
    (targetUserLevel: RoleLevel): boolean => {
      if (!level) return false;
      // Un utilisateur ne peut modifier que des utilisateurs de niveau strictement inférieur
      return level > targetUserLevel;
    },
    [level],
  );

  const canAssignRole = useCallback(
    (roleLevel: RoleLevel): boolean => {
      if (!level) return false;
      // Ne peut assigner que des rôles de niveau inférieur au sien
      return level > roleLevel;
    },
    [level],
  );

  return useMemo(
    () => ({
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
      isExactlyLevel,
      getRestriction,
      getPermissionToggle,
      getRoleColor,
      getRoleName,
      canModifyUser,
      canAssignRole,
    }),
    [
      role,
      level,
      permissions,
      isLoading,
      session?.isAuthenticated,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isAboveLevel,
      isAtLeastLevel,
      isExactlyLevel,
      getRestriction,
      getPermissionToggle,
      getRoleColor,
      getRoleName,
      canModifyUser,
      canAssignRole,
    ],
  );
}
