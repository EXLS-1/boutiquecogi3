// hooks/use-is-admin.ts
// This hook provides a reusable and typed way to check if the current user has an admin role.
// It centralizes the normalization logic (case-insensitive) to ensure consistency across the app.
// This allows components like RoleGuard and AuthButton to rely on a single source of truth for admin checks.
"use client";

import { authClient } from "@/lib/auth/auth-client";
import { useMemo, useState, useEffect } from "react";

/**
 * Hook useIsAdmin
 * Fournit une vérification réutilisable et typée du rôle administrateur.
 * Centralise la logique de normalisation (case-insensitive).
 */
export function useIsAdmin() {
  const [isHydrated, setIsHydrated] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const isAdmin = useMemo(() => {
    if (!isHydrated || !session?.user) return false;

    const rawRole = session.user.role;
    // Normalisation alignée sur RoleGuard et AuthButton
    return (
      String(rawRole ?? "user").toLowerCase() === "admin" || rawRole === "ADMIN"
    );
  }, [session]);

  return {
    isAdmin,
    isPending: isPending || !isHydrated,
    user: session?.user,
    isHydrated,
  };
}
