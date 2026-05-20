"use client";

import { authClient } from "@/lib/auth/auth-client";
import { useMemo } from "react";

/**
 * Hook useIsAdmin
 * Fournit une vérification réutilisable et typée du rôle administrateur.
 * Centralise la logique de normalisation (case-insensitive).
 */
export function useIsAdmin() {
  const { data: session, isPending } = authClient.useSession();

  const isAdmin = useMemo(() => {
    if (!session?.user) return false;

    const rawRole = session.user.role;
    // Normalisation alignée sur RoleGuard et AuthButton
    return (
      String(rawRole ?? "user").toLowerCase() === "admin" || rawRole === "ADMIN"
    );
  }, [session]);

  return { isAdmin, isPending, user: session?.user };
}
