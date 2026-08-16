// components/auth/sign-out-button.tsx
"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";

interface SignOutButtonProps extends ComponentPropsWithoutRef<typeof Button> {
  redirectTo?: string;
  onSuccessCallback?: () => void;
}

export function SignOutButton({
  children = "Déconnexion",
  className,
  variant = "outline",
  redirectTo = "/auth/sign-in",
  onSuccessCallback,
  disabled,
  ...props
}: SignOutButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    if (isPending) return;
    setIsPending(true);

    try {
      const { error } = await authClient.signOut();

      if (error) {
        console.error("[AUTH_SIGNOUT_ERROR]", error.message);
        toast.error(error.message || "Erreur lors de la déconnexion.", { duration: 5000 });
        setIsPending(false);
        return;
      }

      toast.success("Déconnexion réussie.", { duration: 5000 });
      onSuccessCallback?.();

      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } catch (err) {
      console.error("[AUTH_SIGNOUT_UNEXPECTED]", err);
      toast.error("Erreur inattendue lors de la déconnexion.", { duration: 5000 });
      setIsPending(false);
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleSignOut}
      disabled={disabled || isPending}
      className={className}
      {...props}
    >
      {isPending ? "Déconnexion..." : children}
    </Button>
  );
}
