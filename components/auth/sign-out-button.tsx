// components/auth/sign-out-button.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

interface SignOutButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function SignOutButton({ className, variant = "outline" }: SignOutButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsPending(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Déconnexion réussie.");
            router.push("/auth/Sign-in"); // Redirection immédiate
            router.refresh(); // Force la purge du cache Next.js
          },
          onError: (ctx) => {
            toast.error(ctx.error.message || "Erreur lors de la déconnexion.");
            setIsPending(false); // On ne débloque le bouton qu'en cas d'erreur
          },
        },
      });
    } catch (error) {
      toast.error("Une erreur inattendue est survenue.");
      setIsPending(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      onClick={handleLogout} 
      disabled={isPending} 
      className={className}
    >
      {isPending ? "Déconnexion..." : "Se déconnecter"}
    </Button>
  );
}