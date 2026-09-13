// hooks/admin/products/use-product-permissions.ts
// ═════════════════════════════════════════════════════════════════════════════
// HOOK — Permissions produits (side-effect free)
// ═════════════════════════════════════════════════════════════════════════════
// Lit les permissions serveur injectées par le parent Server Component.
// À utiliser dans les guards UI et conditionnel rendering.

"use client";

import { useMemo } from "react";
import type { PermissionCode } from "@/lib/auth/rbac";

interface ProductPermissions {
  /** Ensemble des permissions accordées */
  granted: Set<PermissionCode>;
  /** Vérifie si l'utilisateur a la permission donnée */
  has: (permission: PermissionCode) => boolean;
  /** Vérifie si l'utilisateur a AU MOINS l'un des permissions */
  hasAny: (permissions: PermissionCode[]) => boolean;
  /** Vérifie si l'utilisateur a TOUTES les permissions */
  hasAll: (permissions: PermissionCode[]) => boolean;
  /** Niveau RBAC de l'utilisateur (1-7) */
  level: number;
  /** Rôle de l'utilisateur */
  role: string;
}

interface UseProductPermissionsOptions {
  role?: string;
  permissions?: PermissionCode[];
  level?: number;
}

export function useProductPermissions({
  role = "GUEST",
  permissions = [],
  level = 7,
}: UseProductPermissionsOptions = {}): ProductPermissions {
  const granted = useMemo(() => new Set<PermissionCode>(permissions), [permissions]);

  return useMemo(
    () => ({
      granted,
      has: (permission: PermissionCode) => granted.has(permission),
      hasAny: (permissions: PermissionCode[]) =>
        permissions.some((p) => granted.has(p)),
      hasAll: (permissions: PermissionCode[]) =>
        permissions.every((p) => granted.has(p)),
      level,
      role,
    }),
    [granted, level, role]
  );
}