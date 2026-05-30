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

  const signin = (data: { email: string; password: string }) =>
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
      router.replace("/auth/signin");
    });

  const signout = () =>
    safe(async () => {
      await authClient.signOut();
      router.replace("/auth/signin");
      router.refresh();
    });

  return { signin, signup, signout, isPending };
}
