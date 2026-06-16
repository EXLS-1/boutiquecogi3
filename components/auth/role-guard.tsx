// components/auth/role-guard.tsx
// Composant de protection des routes basé sur le système RBAC hiérarchique (Level 1-6)
// Remplace l'ancienne logique binaire "admin/user" par une hiérarchie stricte

"use client";

import { ReactNode, memo } from "react";
import { useRBAC } from "@/hooks/rbac/use-rbac";
import { Permission } from "@/lib/auth/rbac";
import { Skeleton } from "@/components/ui/skeleton";

type RoleLevel = number;

// =============================================================================
// TYPES
// =============================================================================

interface BaseGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
}

/** Protection par niveau hiérarchique minimum (Level 1-6) */
interface LevelGuardProps extends BaseGuardProps {
  minLevel: RoleLevel;
  exactLevel?: never;
  permissions?: never;
  requireAll?: never;
}

/** Protection par niveau hiérarchique exact */
interface ExactLevelGuardProps extends BaseGuardProps {
  exactLevel: RoleLevel;
  minLevel?: never;
  permissions?: never;
  requireAll?: never;
}

/** Protection par permissions atomiques */
interface PermissionGuardProps extends BaseGuardProps {
  permissions: Permission[];
  requireAll?: boolean;
  minLevel?: never;
  exactLevel?: never;
}

/** Protection combinée (niveau ET permissions) */
interface CombinedGuardProps extends BaseGuardProps {
  minLevel: RoleLevel;
  permissions: Permission[];
  requireAll?: boolean;
  exactLevel?: never;
}

/** Protection par plage de niveaux */
interface LevelRangeGuardProps extends BaseGuardProps {
  minLevel: RoleLevel;
  maxLevel: RoleLevel;
  permissions?: never;
  requireAll?: never;
  exactLevel?: never;
}

/** Props unifiées avec discriminant */
type RoleGuardProps =
  | LevelGuardProps
  | ExactLevelGuardProps
  | PermissionGuardProps
  | CombinedGuardProps
  | LevelRangeGuardProps;

// =============================================================================
// COMPOSANT PRINCIPAL (backward-compatible avec l'ancien RoleGuard)
// =============================================================================

/**
 * RoleGuard - Composant de protection RBAC unifié
 *
 * Usage par niveau (recommandé):
 *   <RoleGuard minLevel={4}>
 *     <AdminPanel />
 *   </RoleGuard>
 *
 * Usage par permissions:
 *   <RoleGuard permissions={["products:create", "products:update"]} requireAll={false}>
 *     <ProductManager />
 *   </RoleGuard>
 *
 * Usage combiné:
 *   <RoleGuard minLevel={4} permissions={["orders:process_refund"]}>
 *     <RefundPanel />
 *   </RoleGuard>
 *
 * Usage par plage:
 *   <RoleGuard minLevel={2} maxLevel={4}>
 *     <ModeratorPanel />
 *   </RoleGuard>
 *
 * Legacy (backward-compatible):
 *   <RoleGuard allowedRoles={["admin"]}>  → mappé sur minLevel={5}
 */
export const RoleGuard = memo(function RoleGuard(props: RoleGuardProps) {
  const { children, fallback = null, loadingComponent } = props;
  const {
    isLoading,
    isAuthenticated,
    isAtLeastLevel,
    hasAnyPermission,
    hasAllPermissions,
    isExactlyLevel,
  } = useRBAC();

  const canAccess = (permissions: Permission[], requireAll: boolean) =>
    requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);

  // État de chargement
  if (isLoading) {
    return (
      <>
        {loadingComponent ?? (
          <div className="flex items-center gap-2 p-4">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        )}
      </>
    );
  }

  // Non authentifié = toujours refusé
  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  let hasAccessRight = false;

  // --- Protection par niveau minimum ---
  if ("minLevel" in props && !("maxLevel" in props) && !("permissions" in props)) {
    // 'in' check ensures property exists but it may be undefined, so assert number
    hasAccessRight = isAtLeastLevel(props.minLevel as number);
  }

  // --- Protection par niveau exact ---
  else if ("exactLevel" in props) {
    hasAccessRight = isExactlyLevel(props.exactLevel as number);
  }

  // --- Protection par permissions ---
  else if ("permissions" in props && !("minLevel" in props)) {
    const requireAll = props.requireAll ?? true;
    hasAccessRight = canAccess(props.permissions, requireAll);
  }

  // --- Protection combinée (niveau + permissions) ---
  else if ("minLevel" in props && "permissions" in props) {
    const meetsLevel = isAtLeastLevel(props.minLevel as number);
    const requireAll = props.requireAll ?? true;
    const meetsPermissions = canAccess(props.permissions as Permission[], requireAll);
    hasAccessRight = meetsLevel && meetsPermissions;
  }

  // --- Protection par plage de niveaux ---
  else if ("minLevel" in props && "maxLevel" in props) {
    const { level } = useRBAC();
    hasAccessRight = !!level && level >= props.minLevel && level <= props.maxLevel;
  }

  if (!hasAccessRight) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
});

// =============================================================================
// COMPOSANTS SPÉCIALISÉS (exports nommés pour usage direct)
// =============================================================================

/** Protection par niveau minimum uniquement */
export const LevelGuard = memo(function LevelGuard({
  minLevel,
  children,
  fallback = null,
  loadingComponent,
}: LevelGuardProps) {
  const { isLoading, isAuthenticated, isAtLeastLevel } = useRBAC();

  if (isLoading) {
    return <>{loadingComponent ?? <Skeleton className="h-8 w-32" />}</>;
  }
  if (!isAuthenticated || !isAtLeastLevel(minLevel)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
});

/** Protection par permissions uniquement */
export const PermissionGuard = memo(function PermissionGuard({
  permissions,
  requireAll = true,
  children,
  fallback = null,
  loadingComponent,
}: PermissionGuardProps) {
  const { isLoading, isAuthenticated, hasAnyPermission, hasAllPermissions } = useRBAC();
  const canAccess = (permissionsList: Permission[], requireAllFlag: boolean) =>
    requireAllFlag ? hasAllPermissions(permissionsList) : hasAnyPermission(permissionsList);

  if (isLoading) {
    return <>{loadingComponent ?? <Skeleton className="h-8 w-32" />}</>;
  }
  if (!isAuthenticated || !canAccess(permissions, requireAll)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
});

/** Protection combinée niveau + permissions */
export const CombinedGuard = memo(function CombinedGuard({
  minLevel,
  permissions,
  requireAll = true,
  children,
  fallback = null,
  loadingComponent,
}: CombinedGuardProps) {
  const { isLoading, isAuthenticated, isAtLeastLevel, hasAnyPermission, hasAllPermissions } = useRBAC();
  const canAccess = (permissionsList: Permission[], requireAllFlag: boolean) =>
    requireAllFlag ? hasAllPermissions(permissionsList) : hasAnyPermission(permissionsList);

  if (isLoading) {
    return <>{loadingComponent ?? <Skeleton className="h-8 w-32" />}</>;
  }

  const meetsLevel = isAtLeastLevel(minLevel);
  const meetsPermissions = canAccess(permissions, requireAll);

  if (!isAuthenticated || !meetsLevel || !meetsPermissions) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
});

/** Protection par plage de niveaux (inclusif) */
export const LevelRangeGuard = memo(function LevelRangeGuard({
  minLevel,
  maxLevel,
  children,
  fallback = null,
  loadingComponent,
}: LevelRangeGuardProps) {
  const { isLoading, isAuthenticated, level } = useRBAC();

  if (isLoading) {
    return <>{loadingComponent ?? <Skeleton className="h-8 w-32" />}</>;
  }

  const inRange = !!level && level >= minLevel && level <= maxLevel;

  if (!isAuthenticated || !inRange) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
});

// =============================================================================
// COMPOSANTS PRÉ-DÉFINIS (niveaux courants)
// =============================================================================

/** Level 6 - Super Admin (accès total) */
export const SuperAdminGuard = memo(function SuperAdminGuard(
  props: Omit<LevelGuardProps, "minLevel">
) {
  return <LevelGuard minLevel={6} {...props} />;
});

/** Level 5+ - Admin */
export const AdminGuard = memo(function AdminGuard(
  props: Omit<LevelGuardProps, "minLevel">
) {
  return <LevelGuard minLevel={5} {...props} />;
});

/** Level 4+ - Manager */
export const ManagerGuard = memo(function ManagerGuard(
  props: Omit<LevelGuardProps, "minLevel">
) {
  return <LevelGuard minLevel={4} {...props} />;
});

/** Level 3+ - Modérateur */
export const ModeratorGuard = memo(function ModeratorGuard(
  props: Omit<LevelGuardProps, "minLevel">
) {
  return <LevelGuard minLevel={3} {...props} />;
});

/** Level 2+ - Vendeur/Affilié */
export const SellerGuard = memo(function SellerGuard(
  props: Omit<LevelGuardProps, "minLevel">
) {
  return <LevelGuard minLevel={2} {...props} />;
});

/** Level 1+ - Client authentifié */
export const CustomerGuard = memo(function CustomerGuard(
  props: Omit<LevelGuardProps, "minLevel">
) {
  return <LevelGuard minLevel={1} {...props} />;
});

// =============================================================================
// HOC (Higher-Order Component) pour protection de pages/composants entiers
// =============================================================================

interface WithRBACOptions {
  minLevel?: RoleLevel;
  exactLevel?: RoleLevel;
  permissions?: Permission[];
  requireAll?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function withRBAC<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithRBACOptions = {}
) {
  return function WithRBACWrapper(props: P) {
    const { isLoading, isAuthenticated, isAtLeastLevel, hasAnyPermission, hasAllPermissions } = useRBAC();
    const router = require("next/navigation").useRouter();
    const canAccess = (permissions: Permission[], requireAll: boolean) =>
      requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);

    if (isLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <Skeleton className="h-8 w-48" />
        </div>
      );
    }

    if (!isAuthenticated) {
      if (options.redirectTo) {
        router.push(options.redirectTo);
        return null;
      }
      return (
        <>{options.fallback ?? <div className="p-8 text-center">Connexion requise</div>}</>
      );
    }

    // Vérification niveau
    if (options.minLevel !== undefined && !isAtLeastLevel(options.minLevel)) {
      if (options.redirectTo) {
        router.push(options.redirectTo);
        return null;
      }
      return <>{options.fallback ?? <div className="p-8 text-center">Accès refusé</div>}</>;
    }

    // Vérification permissions
    if (options.permissions && !canAccess(options.permissions, options.requireAll ?? true)) {
      if (options.redirectTo) {
        router.push(options.redirectTo);
        return null;
      }
      return <>{options.fallback ?? <div className="p-8 text-center">Permissions insuffisantes</div>}</>;
    }

    return <WrappedComponent {...props} />;
  };
}

// =============================================================================
// EXPORTS
// =============================================================================
export default RoleGuard;
