// lib/auth/auth-client.ts
// Client d'authentification centralisé pour la boutique COGI3.
// Ce module utilise Better-Auth pour gérer les sessions côté client et propose une abstraction hookée pour l'UI.
"use client";

import { createAuthClient } from "better-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified: boolean;
  role?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  user: SessionUser;
  token: string;
  expiresAt: Date;
}

export const authClient = createAuthClient({
  // Utilisation d'une base URL robuste avec fallback dynamique côté navigateur
  baseURL:
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    (typeof window !== "undefined" ? window.location.origin : ""),
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

/**
 * Hook 'useAuth' : Abstraction pour les formulaires et la gestion de session.
 * Optimisé pour React 19 avec support des transitions et gestion d'erreurs centralisée.
 */
export function useAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, setIsPending] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Récupération dynamique de la destination après auth
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  /**
   * Exécute une action Better-Auth et gère la navigation/rafraîchissement.
   */
  const handleAction = async (promise: Promise<any>) => {
    setIsPending(true);
    setError(null);
    try {
      const result = await promise;

      if (result?.error || (result && "error" in result)) {
        setError(
          result.error.message || "Erreur d'authentification inattendue.",
        );
        return { success: false, error: result.error };
      }

      // startTransition permet de marquer le rafraîchissement comme non-urgent pour l'UI
      startTransition(() => {
        router.push(callbackUrl);
        router.refresh();
      });

      return { success: true };
    } catch (err: any) {
      setError(
        err.message || "Le service d'authentification est indisponible.",
      );
      return { success: false, error: err };
    } finally {
      setIsPending(false);
    }
  };

  const performSignOut = async () => {
    setIsPending(true);
    await signOut();
    startTransition(() => {
      router.push("/auth/sign-in");
      router.refresh();
    });
    setIsPending(false);
  };

  return {
    isPending: isPending || isRefreshing,
    error,
    session: useSession(),
    signIn: (email: string, password: string) =>
      handleAction(authClient.signIn.email({ email, password })),
    signUp: (name: string, email: string, password: string, image?: string) =>
      handleAction(authClient.signUp.email({ name, email, password, image })),
    signOut: performSignOut,
  };
}
