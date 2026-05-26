"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth/auth-client";

/**
 * Composant SignUpButton
 * Gère la navigation vers la page d'inscription. 
 * Stylisé pour être l'appel à l'action (CTA) principal dans la Navbar.
 */
export default function SignUpButton() {
  const { data: session, isPending } = authClient.useSession();

  // Skeleton aligné sur les dimensions du bouton CTA
  if (isPending) return <Skeleton className="h-10 w-32 rounded-md" />;

  // Masquage si session existante
  if (session) return null;

  return (
    <Button
      asChild
      className="bg-cyan-400 hover:bg-rose-500 text-white shadow-sm transition-all duration-300 active:scale-95"
    >
      <Link href="/auth/sign-up" className="flex items-center gap-2">
        <UserPlus className="w-4 h-4" />
        <span className="font-semibold">S&apos;inscrire</span>
      </Link>
    </Button>
  );
}