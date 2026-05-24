// app/auth/auth-client.tsx
// Client d'authentification centralisé pour la boutique COGI3
"use client";

import { createAuthClient } from "better-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Boutique COGI3 - Client d'authentification centralisé.
 * Instance Better-Auth configurée pour les interactions côté client.
 * Supporte le rafraîchissement de session et les callbacks d'authentification.
 */
export const authClient = createAuthClient({
  // On s'assure que la baseURL est définie pour les redirections OAuth
  baseURL: process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : ""),
});

/**
 * Export des méthodes et hooks natifs du client pour une utilisation granulaire.
 */
export const { signIn, signUp, signOut, useSession, getSession } = authClient;

/**
 * Hook 'useAuth' : Abstraction robuste pour les formulaires d'authentification.
 * Gère les états de transition Next.js 16, les redirections intelligentes (callbackUrl)
 * et la capture centralisée des erreurs.
 */
export function useAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, setIsPending] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // URL cible après authentification (callbackUrl ou racine)
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  /**
   * Encapsule l'exécution d'une promesse Better-Auth avec gestion d'état UI.
   */
  const handleAction = async (promise: Promise<any>) => {
    setIsPending(true);
    setError(null);
    try {
      const result = await promise;
      
      if (result?.error || (result && 'error' in result)) {
        setError(result.error.message || "Erreur d'authentification inattendue.");
        return { success: false, error: result.error };
      }

      // On déclenche la transition pour le rafraîchissement des RSC
      // La redirection ne se fait qu'après validation du succès
      router.push(callbackUrl);
      router.refresh();
      
      return { success: true };
    } catch (err: any) {
      setError(err.message || "Impossible de joindre le service d'authentification.");
      return { success: false, error: err };
    } finally {
      setIsPending(false);
    }
  };

  const performSignOut = async () => {
    setIsPending(true);
    await signOut();
    router.push("/auth/sign-in");
    router.refresh();
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