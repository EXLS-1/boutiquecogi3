"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";

/**
 * Composant SignInButton
 * Gère la navigation vers la page de connexion avec une vérification de session active.
 */
export default function SignInButton() {
  const { data: session, isPending } = authClient.useSession();

  // Si l'utilisateur est déjà connecté ou que la session charge, on ne rend rien pour la performance
  if (session || isPending) return null;

  return (
    <Button
      asChild
      variant="ghost"
      className="text-cyan-700 hover:text-rose-700 hover:bg-cyan-50 transition-colors duration-200"
    >
      <Link href="/auth/sign-in" className="flex items-center gap-2">
        <LogIn className="w-4 h-4" />
        <span className="font-medium">Connexion</span>
      </Link>
    </Button>
  );
}
