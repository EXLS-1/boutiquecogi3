// components/auth/rbac-sync-manager.tsx

"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { useRBACStore } from "@/store/use-rbac-store";
import type { Permission } from "@/lib/auth/rbac-shared";

// ─── Types locaux pour la structure de rôle dans la session ─────────────────

interface RoleDataPermission {
  value: string;
  permission: Permission;
}

interface RoleData {
  name?: string;
  level?: number;
  permissions?: RoleDataPermission[];
}

type SessionUserWithRole = {
  role?: RoleData | null;
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
        // Récupération typée du rôle depuis la session Better-Auth
        const user = session.user as SessionUserWithRole;
        const roleData = user.role;

        // Calcul des permissions effectives pour une recherche O(1)
        const effectivePermissions = new Set<Permission>();

        if (roleData?.permissions && Array.isArray(roleData.permissions)) {
          roleData.permissions.forEach((p: RoleDataPermission) => {
            if (p.value === "ON" && p.permission) {
              effectivePermissions.add(p.permission);
            }
          });
        }

        const rbacSession = {
          user: session.user,
          role: roleData ?? null,
          level: roleData?.level ?? null,
          effectivePermissions,
          isAuthenticated: true as const,
        };

        // Cast intermédiaire via unknown pour respecter le contrat du store
        // sans recourir à `any`
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
