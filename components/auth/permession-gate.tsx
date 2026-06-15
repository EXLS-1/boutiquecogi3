// /components/auth/PermissionGate.tsx
// ============================================
// Server Component — rendu conditionnel basé sur les permissions
// ============================================

import { ReactNode } from "react";
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getCurrentUserRole,
  type Permission,
} from "@/lib/auth/rbac";

interface PermissionGateProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean; // true = toutes requises, false = au moins une
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Gate conditionnel pour Server Components.
 * Vérifie les permissions côté serveur avant le rendu.
 *
 * Usage :
 * <PermissionGate permission="products:create">
 *   <CreateProductButton />
 * </PermissionGate>
 *
 * <PermissionGate permissions={["products:update", "products:delete"]} requireAll>
 *   <AdminProductControls />
 * </PermissionGate>
 */
export async function PermissionGate({
  permission,
  permissions,
  requireAll = true,
  children,
  fallback = null,
}: PermissionGateProps) {
  const role = await getCurrentUserRole();

  let hasAccess = false;

  if (permission) {
    hasAccess = await hasPermission(role, permission);
  } else if (permissions) {
    hasAccess = requireAll
      ? await hasAllPermissions(role, permissions)
      : await hasAnyPermission(role, permissions);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}