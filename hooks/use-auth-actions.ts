// /hooks/use-auth-actions.ts
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { mapAuthError } from "@/lib/auth/errors";
import toast from "react-hot-toast";

export function useAuthActions() {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

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

  const login = (data: { email: string; password: string }) =>
    safe(async () => {
      await authClient.signIn.email(data);
      toast.success("Connecté");
      router.replace("/");
      router.refresh();
    });

  const signup = (data: { email: string; password: string }) =>
    safe(async () => {
      await authClient.signUp.email(data);
      toast.success("Compte créé");
      router.replace("/auth/login");
    });

  const logout = () =>
    safe(async () => {
      await authClient.signOut();
      router.replace("/auth/login");
      router.refresh();
    });

  return { login, signup, logout, isPending };
}
