// components/auth/rbac-sync-manager.tsx

"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { useRBACStore } from "@/store/use-rbac-store";
import { Permission } from "@/lib/auth/rbac";
import type { useRBACSession } from "@/store/use-rbac-store";

/**
 * RBACSyncManager - Synchronise Better-Auth avec Zustand.
 * Ce composant ne fait aucun rendu visuel.
 */
export function RBACSyncManager() {
  const { data: session, isPending } = authClient.useSession();
  const setSession = useRBACStore((state) => state.setSession);
  const setLoading = useRBACStore((state) => state.setLoading);

  useEffect(() => {
    // On synchronise l'état de chargement
    setLoading(isPending);

    if (!isPending) {
      if (session?.user) {
        // Note: Better-Auth doit être configuré pour inclure le rôle dans le JWT/Session
        const user = session.user as any;
        const roleData = user.role;

        // Calcul des permissions effectives pour une recherche ultra-rapide
        const effectivePermissions = new Set<Permission>();

        if (roleData?.permissions && Array.isArray(roleData.permissions)) {
          roleData.permissions.forEach((p: any) => {
            if (p.value === "ON") {
              effectivePermissions.add(p.permission);
            }
          });
        }

        const rbacSession = {
          user: session.user,
          role: roleData || null,
          level: roleData?.level || null,
          effectivePermissions,
          isAuthenticated: true,
        };

        setSession(rbacSession as any);
      } else {
        // Nettoyage du store si déconnecté
        setSession(null);
      }
    }
  }, [session, isPending, setSession, setLoading]);

  return null;
}
