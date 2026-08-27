// hooks/use-auth-actions.ts
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { useRBACStore } from "@/store/rbac-store";
import { mapAuthError } from "@/lib/auth/errors";
import toast from "react-hot-toast";

export function useAuthActions() {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const invalidateCache = useRBACStore((s) => s.invalidateCache);

  const safe = async (fn: () => Promise<void>) => {
    if (isPending) return;
    setIsPending(true);

    try {
      await fn();
    } catch (e) {
      toast.error(mapAuthError(e));
    } finally {
      setIsPending(false);
    }
  };

  const signin = (data: { email: string; password: string }) =>
    safe(async () => {
      const res = await authClient.signIn.email(data, {
        onError: () => {
          toast.error(
            "Vous n'avez pas de compte actif. Veuillez en créer un avec vos coordonnées actuelles"
          );
          router.push("/auth/sign-up");
        },
      });
      if (res?.data) {
        invalidateCache(); // ← INVALIDE LE CACHE RBAC AU LOGIN
        toast.success("Connecté");
        router.replace("/");
        router.refresh();
      }
    });

  const signup = (data: { email: string; password: string }) =>
    safe(async () => {
      await authClient.signUp.email(data);
      toast.success("Compte créé");
      router.replace("/auth/sign-in");
    });

  const signout = () =>
    safe(async () => {
      await authClient.signOut();
      invalidateCache(); // ← INVALIDE LE CACHE RBAC AU LOGOUT
      router.replace("/auth/sign-in");
      router.refresh();
    });

  return { signin, signup, signout, isPending };
}
