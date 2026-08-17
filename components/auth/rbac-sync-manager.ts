// components/auth/rbac-sync-manager.tsx

"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { useRBACStore } from "@/store/use-rbac-store";
import {
  DEFAULT_ROLE_CONFIG,
  normalizeRole,
  getRoleLevel,
  type Permission,
} from "@/lib/auth/rbac-shared";

// ─── Types locaux pour la structure de rôle dans la session ─────────────────

interface RoleDataPermission {
  value: string;
  permission: Permission;
}

interface RoleDataObject {
  name?: string;
  role?: string;
  level?: number;
  permissions?: RoleDataPermission[];
}

type SessionUserWithRole = {
  role?: string | RoleDataObject | null;
  level?: number | null;
};

/**
 * RBACSyncManager — Synchronise Better-Auth avec Zustand.
 * Ce composant ne fait aucun rendu visuel.
 */
export function RBACSyncManager() {
  const { data: session, isPending } = authClient.useSession();
  const setSession = useRBACStore((state) => state.setSession);
  const setLoading = useRBACStore((state) => state.setLoading);

  useEffect(() => {
    setLoading(isPending);

    if (!isPending) {
      if (session?.user) {
        // Récupération du rôle depuis la session enrichie par customSession
        const user = session.user as unknown as SessionUserWithRole;
        const rawRole =
          typeof user.role === "string"
            ? user.role
            : user.role?.role || user.role?.name || null;

        const normalizedRole = normalizeRole(rawRole);
        const level =
          typeof user.level === "number"
            ? user.level
            : typeof user.role === "object" && typeof user.role?.level === "number"
            ? user.role.level
            : getRoleLevel(normalizedRole);

        // Calcul des permissions effectives pour une recherche O(1)
        const effectivePermissions = new Set<Permission>();

        // 1. Initialiser avec les permissions par défaut du rôle
        const defaultRoleConfig = DEFAULT_ROLE_CONFIG[normalizedRole];
        if (defaultRoleConfig?.permissions) {
          for (const [permKey, state] of Object.entries(
            defaultRoleConfig.permissions
          )) {
            if (state === "ON") {
              effectivePermissions.add(permKey as Permission);
            }
          }
        }

        // 2. Appliquer les surcharges éventuelles si permissions explicites
        if (
          typeof user.role === "object" &&
          user.role?.permissions &&
          Array.isArray(user.role.permissions)
        ) {
          user.role.permissions.forEach((p: RoleDataPermission) => {
            if (p.value === "ON" && p.permission) {
              effectivePermissions.add(p.permission);
            } else if (p.value === "OFF" && p.permission) {
              effectivePermissions.delete(p.permission);
            }
          });
        }

        const rbacSession = {
          user: session.user,
          role: normalizedRole,
          level,
          effectivePermissions,
          isAuthenticated: true as const,
        };

        // Cast intermédiaire via unknown pour respecter le contrat du store
        type StoreSession = Parameters<typeof setSession>[0];
        setSession(rbacSession as unknown as StoreSession);
      } else {
        // Nettoyage du store si déconnecté
        setSession(null);
      }
    }
  }, [session, isPending, setSession, setLoading]);

  return null;
}

