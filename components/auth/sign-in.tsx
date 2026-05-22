"use client";

import { useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pendant le chargement ou avant le montage (SSR), on rend null ou un skeleton 
  // pour correspondre parfaitement au rendu serveur initial.
  if (!mounted || isPending) {
    return null;
  }

  // Si l'utilisateur est déjà connecté, on ne rend rien
  if (session) return null;

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
