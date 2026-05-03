// /hooks/use-auth.ts
"use client";

import { authClient } from "@/lib/auth/client";

export function useAuth() {
  const session = authClient.useSession();

  return {
    user: session.data?.user ?? null,
    isLoading: session.isPending,
    isAuthenticated: !!session.data?.user,
  };
}
