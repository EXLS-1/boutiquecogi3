// components/admin/products/shared/product-permission-guard.tsx
// ═════════════════════════════════════════════════════════════════════════════
// COMPONENT — Guard de permission produit (client)
// ═════════════════════════════════════════════════════════════════════════════
// Affiche les enfants uniquement si l'utilisateur a la permission.
// Utilise le hook useProductPermissions pour lire les permissions injectées.

"use client";

import { useProductPermissions } from "@/hooks/admin/products/use-product-permissions";
import type { PermissionCode } from "@/lib/auth/rbac";

interface CanProps {
  /** Permission requise (code canonique, ex: "products:create") */
  permission: PermissionCode;
  /** Contenu affiché si la permission est accordée */
  children: React.ReactNode;
  /** Contenu affiché si la permission est refusée (par défaut: rien) */
  fallback?: React.ReactNode;
  /** Si true, affiche fallback au lieu de rien quand permission refusée */
  showFallback?: boolean;
}

export function Can({
  permission,
  children,
  fallback = null,
  showFallback = false,
}: CanProps) {
  const { has } = useProductPermissions();

  if (has(permission)) {
    return <>{children}</>;
  }

  return showFallback ? <>{fallback}</> : null;
}

interface CanAnyProps {
  /** Permissions dont au moins une doit être accordée */
  permissions: PermissionCode[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export function CanAny({
  permissions,
  children,
  fallback = null,
  showFallback = false,
}: CanAnyProps) {
  const { hasAny } = useProductPermissions();

  if (hasAny(permissions)) {
    return <>{children}</>;
  }

  return showFallback ? <>{fallback}</> : null;
}

interface CanAllProps {
  /** Permissions que toutes doivent être accordées */
  permissions: PermissionCode[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export function CanAll({
  permissions,
  children,
  fallback = null,
  showFallback = false,
}: CanAllProps) {
  const { hasAll } = useProductPermissions();

  if (hasAll(permissions)) {
    return <>{children}</>;
  }

  return showFallback ? <>{fallback}</> : null;
}