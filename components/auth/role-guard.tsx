// components/auth/role-guard.tsx
// Composant de protection des routes basé sur le système RBAC hiérarchique (Level 1-6)
// HIÉRARCHIE DESCENDANTE : Level 1 = SUPER_ADMIN → Level 6 = CLIENT

"use client";

import React, { ReactNode, memo } from "react";
import { useRBAC } from "@/hooks/rbac/use-rbac";
import { Permission, RoleLevelValue } from "@/lib/auth/rbac";
import { Skeleton } from "@/components/ui/skeleton";

// =============================================================================
// TYPES
// =============================================================================

interface BaseGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
}

/** Protection par niveau hiérarchique maximum (Level 1 = plus haut) */
interface MaxLevelGuardProps extends BaseGuardProps {
  maxLevel: RoleLevelValue;      // Niveau MAXIMUM autorisé (1 = Super Admin)
  minLevel?: never;
  exactLevel?: never;
  permissions?: never;
  requireAll?: never;
}

/** Protection par niveau hiérarchique minimum (Level 6 = plus bas) */
interface MinLevelGuardProps extends BaseGuardProps {
  minLevel: RoleLevelValue;      // Niveau MINIMUM autorisé (6 = Client)
  maxLevel?: never;
  exactLevel?: never;
  permissions?: never;
  requireAll?: never;
}

/** Protection par niveau hiérarchique exact */
interface ExactLevelGuardProps extends BaseGuardProps {
  exactLevel: RoleLevelValue;
  minLevel?: never;
  maxLevel?: never;
  permissions?: never;
  requireAll?: never;
}

/** Protection par permissions atomiques */
interface PermissionGuardProps extends BaseGuardProps {
  permissions: Permission[];
  requireAll?: boolean;
  minLevel?: never;
  maxLevel?: never;
  exactLevel?: never;
}

/** Protection combinée (niveau ET permissions) */
interface CombinedGuardProps extends BaseGuardProps {
  maxLevel: RoleLevelValue;      // Plus petit = plus haut dans la hiérarchie
  permissions: Permission[];
  requireAll?: boolean;
  minLevel?: never;
  exactLevel?: never;
}

/** Protection par plage de niveaux */
interface LevelRangeGuardProps extends BaseGuardProps {
  maxLevel: RoleLevelValue;      // Plus petit = plus haut
  minLevel: RoleLevelValue;      // Plus grand = plus bas
  permissions?: never;
  requireAll?: never;
  exactLevel?: never;
}

/** Props unifiées avec discriminant */
type RoleGuardProps =
  | MaxLevelGuardProps        // maxLevel=1 → Super Admin uniquement
  | MinLevelGuardProps        // minLevel=6 → Client uniquement
  | ExactLevelGuardProps
  | PermissionGuardProps
  | CombinedGuardProps
  | LevelRangeGuardProps;

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

/**
 * RoleGuard - Composant de protection RBAC unifié
 *
 * HIÉRARCHIE DESCENDANTE :
 *   Level 1 = SUPER_ADMIN (plus haut)
 *   Level 2 = ADMIN
 *   Level 3 = MANAGER
 *   Level 4 = MODERATOR
 *   Level 5 = SELLER
 *   Level 6 = CUSTOMER (plus bas)
 *
 * Usage par niveau maximum (recommandé) :
 *   <RoleGuard maxLevel={3}>     → Manager, Admin, Super Admin
 *   <RoleGuard maxLevel={1}>     → Super Admin uniquement
 *
 * Usage par niveau minimum :
 *   <RoleGuard minLevel={5}>     → Seller, Customer
 *
 * Usage par permissions :
 *   <RoleGuard permissions={["products:create", "products:update"]} requireAll={false}>
 *
 * Usage combiné :
 *   <RoleGuard maxLevel={3} permissions={["orders:process_refund"]}>
 *     → Manager+ ET permission remboursement
 */
export const RoleGuard = memo(function RoleGuard(props: RoleGuardProps) {
  const { children, fallback = null, loadingComponent } = props;
  const { isLoading, isAuthenticated, level } = useRBAC();

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
  if (!isAuthenticated || !level) {
    return <>{fallback}</>;
  }

  let hasAccessRight = false;

  // --- Protection par niveau MAXIMUM (1 = Super Admin) ---
  if ("maxLevel" in props && !("minLevel" in props) && !("permissions" in props)) {
    // userLevel doit être <= maxLevel (plus petit = plus haut)
    hasAccessRight = level <= props.maxLevel;
  }

  // --- Protection par niveau MINIMUM (6 = Client) ---
  else if ("minLevel" in props && !("maxLevel" in props) && !("permissions" in props)) {
    // userLevel doit être >= minLevel (plus grand = plus bas)
    hasAccessRight = level >= props.minLevel;
  }

  // --- Protection par niveau EXACT ---
  else if ("exactLevel" in props) {
    hasAccessRight = level === props.exactLevel;
  }

  // --- Protection par permissions ---
  else if ("permissions" in props && !("maxLevel" in props) && !("minLevel" in props)) {
    const { canAccess } = useRBAC();
    const requireAll = props.requireAll ?? true;
    hasAccessRight = canAccess(props.permissions, requireAll);
  }

  // --- Protection combinée (maxLevel + permissions) ---
  else if ("maxLevel" in props && "permissions" in props) {
    const { canAccess } = useRBAC();
    const meetsLevel = level <= props.maxLevel;
    const requireAll = props.requireAll ?? true;
    const meetsPermissions = canAccess(props.permissions, requireAll);
    hasAccessRight = meetsLevel && meetsPermissions;
  }

  // --- Protection par plage de niveaux ---
  else if ("maxLevel" in props && "minLevel" in props) {
    hasAccessRight = level >= props.maxLevel && level <= props.minLevel;
  }

  if (!hasAccessRight) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
});

// =============================================================================
// COMPOSANTS SPÉCIALISÉS (exports nommés)
// =============================================================================

/** Level 1 - Super Admin uniquement */
export const SuperAdminGuard = memo(function SuperAdminGuard(
  props: Omit<BaseGuardProps, never>
) {
  return <RoleGuard maxLevel={1} {...props} />;
});

/** Level 1-2 - Admin et Super Admin */
export const AdminGuard = memo(function AdminGuard(
  props: Omit<BaseGuardProps, never>
) {
  return <RoleGuard maxLevel={2} {...props} />;
});

/** Level 1-3 - Manager, Admin, Super Admin */
export const ManagerGuard = memo(function ManagerGuard(
  props: Omit<BaseGuardProps, never>
) {
  return <RoleGuard maxLevel={3} {...props} />;
});

/** Level 1-4 - Modérateur et au-dessus */
export const ModeratorGuard = memo(function ModeratorGuard(
  props: Omit<BaseGuardProps, never>
) {
  return <RoleGuard maxLevel={4} {...props} />;
});

/** Level 1-5 - Vendeur et au-dessus */
export const SellerGuard = memo(function SellerGuard(
  props: Omit<BaseGuardProps, never>
) {
  return <RoleGuard maxLevel={5} {...props} />;
});

/** Level 6 - Client uniquement */
export const CustomerGuard = memo(function CustomerGuard(
  props: Omit<BaseGuardProps, never>
) {
  return <RoleGuard minLevel={6} {...props} />;
});

/** Level 1-6 - Tous les utilisateurs authentifiés */
export const AuthenticatedGuard = memo(function AuthenticatedGuard(
  props: Omit<BaseGuardProps, never>
) {
  return <RoleGuard maxLevel={6} {...props} />;
});

// =============================================================================
// HOC (Higher-Order Component)
// =============================================================================

interface WithRBACOptions {
  maxLevel?: RoleLevel;
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
    const { isLoading, isAuthenticated, level, canAccess } = useRBAC();
    const router = require("next/navigation").useRouter();

    if (isLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <Skeleton className="h-8 w-48" />
        </div>
      );
    }

    if (!isAuthenticated || !level) {
      if (options.redirectTo) {
        router.push(options.redirectTo);
        return null;
      }
      return (
        <>{options.fallback ?? <div className="p-8 text-center">Connexion requise</div>}</>
      );
    }

    // Vérification niveau maximum
    if (options.maxLevel !== undefined && level > options.maxLevel) {
      if (options.redirectTo) {
        router.push(options.redirectTo);
        return null;
      }
      return <>{options.fallback ?? <div className="p-8 text-center">Accès refusé</div>}</>;
    }

    // Vérification niveau minimum
    if (options.minLevel !== undefined && level < options.minLevel) {
      if (options.redirectTo) {
        router.push(options.redirectTo);
        return null;
      }
      return <>{options.fallback ?? <div className="p-8 text-center">Accès refusé</div>}</>;
    }

    // Vérification niveau exact
    if (options.exactLevel !== undefined && level !== options.exactLevel) {
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
