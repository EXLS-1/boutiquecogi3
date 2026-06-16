// hooks/use-auth.ts
"use client";

import { useRBAC } from "@/hooks/rbac/use-rbac";

export function useAuth() {
  const { isLoading, isAuthenticated, role, level } = useRBAC();

  return {
    user: null, // Récupéré via Better-Auth direct si besoin
    isLoading,
    isAuthenticated,
    role,
    level,
  };
}
