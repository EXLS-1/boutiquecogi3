"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";

/**
 * Composant SignUpButton
 * Gère la navigation vers la page d'inscription. 
 * Stylisé pour être l'appel à l'action (CTA) principal dans la Navbar.
 */
export default function SignUpButton() {
  const { data: session, isPending } = authClient.useSession();

  // Masquage si session existante pour une interface épurée
  if (session || isPending) return null;

  return (
    <Button
      asChild
      className="bg-cyan-700 hover:bg-rose-700 text-white shadow-sm transition-all duration-300 active:scale-95"
    >
      <Link href="/auth/sign-up" className="flex items-center gap-2">
        <UserPlus className="w-4 h-4" />
        <span className="font-semibold">S&apos;inscrire</span>
      </Link>
    </Button>
  );
}
