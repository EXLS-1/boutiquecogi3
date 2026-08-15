// components/auth/sign-out-button.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";

interface SignOutButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

type StatusToast = {
  type: "success" | "error";
  message: string;
};

export function SignOutButton({ className, variant = "outline" }: SignOutButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [statusToast, setStatusToast] = useState<StatusToast | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!statusToast) return;

    const timer = window.setTimeout(() => {
      setStatusToast(null);
      setIsPending(false);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [statusToast]);

  const handleLogout = async () => {
    if (isPending) return;

    setIsPending(true);

    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            setStatusToast({ type: "success", message: "Déconnexion réussie." });
            router.push("/auth/sign-in");
            router.refresh();
          },
          onError: (ctx) => {
            const message = ctx.error.message || "Erreur lors de la déconnexion.";
            setStatusToast({ type: "error", message });
          },
        },
      });
    } catch (error) {
      setStatusToast({ type: "error", message: "Une erreur inattendue est survenue." });
    }
  };

  return (
    <>
      {statusToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
          <div
            role={statusToast.type === "success" ? "status" : "alert"}
            className={`rounded-xl border px-5 py-3 text-sm font-medium shadow-lg ${
              statusToast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {statusToast.message}
          </div>
        </div>
      )}

      <Button
        variant={variant}
        onClick={handleLogout}
        disabled={isPending}
        className={className}
      >
        {isPending ? "En cours..." : "Se déconnecter"}
      </Button>
    </>
  );
}