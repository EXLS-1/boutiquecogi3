// hooks/rbac/use-rbac.ts
"use client";

import { useCallback, useMemo } from "react";
import { useRBACStore } from "@/store/use-rbac-store";
import {
  Permission,
  Role,
  getRoleLevel,
  normalizeRole,
  getRoleConfig,
  isAdminOrSuperAdmin,
  isStaffOrAbove,
  type RoleConfig,
} from "@/lib/auth/rbac-shared";

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

export interface UserSessionData {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
}

interface UseRBACReturn {
  // État
  role: Role | null;
  level: RoleLevel | null;
  permissions: Permission[];
  isLoading: boolean;
  isPending: boolean; // Alias UI
  isAuthenticated: boolean;
  user: UserSessionData | null;

  // Métadonnées d'affichage UI & Rôles
  roleConfig: RoleConfig;
  isAdmin: boolean;
  isStaff: boolean;

  // Vérifications de niveau & permissions
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;

  // Comparaison de niveaux
  isAboveLevel: (targetLevel: RoleLevel) => boolean;
  isAtLeastLevel: (targetLevel: RoleLevel) => boolean;
  isAtMostLevel: (targetLevel: RoleLevel) => boolean;
  isExactlyLevel: (exactLevel: RoleLevel) => boolean;
  isBelowLevel: (targetLevel: RoleLevel) => boolean;

  // Métadonnées
  getRestriction: (permission: Permission) => RBACRestriction | null;
  getPermissionToggle: (permission: Permission) => PermissionToggle | null;
  getRoleColor: () => string;
  getRoleName: () => string;

  // Hiérarchie
  canModifyUser: (targetUserLevel: RoleLevel) => boolean;
  canAssignRole: (targetRoleLevel: RoleLevel) => boolean;
  canAccess: (requiredPermissions: Permission[], requireAll?: boolean) => boolean;
}

export function useRBAC(): UseRBACReturn {
  const store = useRBACStore();
  const { session, isLoading } = store;

  // Extraction sécurisée de l'utilisateur et du rôle
  const user = useMemo(() => {
    return ((session as unknown as { user?: UserSessionData })?.user ?? null);
  }, [session]);

  const rawRole = (session as unknown as { role?: Role; user?: { role?: Role } } | null)?.role ??
    user?.role ?? null;

  const level =
    (session as unknown as { level?: RoleLevel; user?: { level?: RoleLevel } } | null)?.level ??
    (session as unknown as { user?: { level?: RoleLevel } } | null)?.user?.level ?? null;

  const normalizedRole = useMemo(() => normalizeRole(rawRole), [rawRole]);
  const roleConfig = useMemo(() => getRoleConfig(normalizedRole), [normalizedRole]);
  const isAdmin = useMemo(() => isAdminOrSuperAdmin(normalizedRole), [normalizedRole]);
  const isStaff = useMemo(() => isStaffOrAbove(normalizedRole), [normalizedRole]);

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

  const isAboveLevel = useCallback((targetLevel: RoleLevel): boolean => {
    if (!level) return false;
    return level < targetLevel;
  }, [level]);

  const isAtLeastLevel = useCallback((targetLevel: RoleLevel): boolean => {
    if (!level) return false;
    return level <= targetLevel;
  }, [level]);

  const isAtMostLevel = useCallback((targetLevel: RoleLevel): boolean => {
    if (!level) return false;
    return level >= targetLevel;
  }, [level]);

  const isExactlyLevel = useCallback((exactLevel: RoleLevel): boolean => {
    return level === exactLevel;
  }, [level]);

  const isBelowLevel = useCallback((targetLevel: RoleLevel): boolean => {
    if (!level) return false;
    return level > targetLevel;
  }, [level]);

  const getRestriction = useCallback(
    (permission: Permission): RBACRestriction | null => {
      if (!rawRole) return null;

      type RolePermissionToggle = {
        permission: Permission;
        restrictedToOwn?: boolean;
        conditions?: Record<string, unknown>;
      };

      const perms = (rawRole as unknown as {
        permissions?: RolePermissionToggle[];
      })?.permissions;

      const toggle = perms?.find((p) => p.permission === permission);
      if (!toggle) return null;

      return {
        restrictedToOwn: !!toggle.restrictedToOwn,
        conditions: toggle.conditions || null,
      };
    },
    [rawRole],
  );

  const getPermissionToggle = useCallback(
    (permission: Permission): PermissionToggle | null => {
      if (!rawRole) return null;

      type RolePermissionToggle = {
        permission: Permission;
        restrictedToOwn?: boolean;
        conditions?: Record<string, unknown>;
      };

      const perms = (rawRole as unknown as {
        permissions?: RolePermissionToggle[];
      })?.permissions;
      return perms?.find((p) => p.permission === permission) ?? null;
    },
    [rawRole],
  );

  const getRoleColor = useCallback((): string => {
    return "#6b7280";
  }, []);

  const getRoleName = useCallback((): string => {
    return rawRole ?? "Invité";
  }, [rawRole]);

  const canModifyUser = useCallback((targetUserLevel: RoleLevel): boolean => {
    if (!level) return false;
    return level < targetUserLevel;
  }, [level]);

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
    role: rawRole,
    level,
    permissions,
    isLoading,
    isPending: isLoading,
    isAuthenticated: !!session?.isAuthenticated,
    user,
    roleConfig,
    isAdmin,
    isStaff,
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
    rawRole, level, permissions, isLoading, session?.isAuthenticated, user,
    roleConfig, isAdmin, isStaff,
    hasPermission, hasAnyPermission, hasAllPermissions,
    isAboveLevel, isAtLeastLevel, isAtMostLevel, isExactlyLevel, isBelowLevel,
    getRestriction, getPermissionToggle, getRoleColor, getRoleName,
    canModifyUser, canAssignRole, canAccess,
  ]);
}
