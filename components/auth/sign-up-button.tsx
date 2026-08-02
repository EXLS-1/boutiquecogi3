// components/auth/sign-up-button.tsx

"use client";

import { useSyncExternalStore } from "react";
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

  // Subscriber vide (nous n'avons pas besoin de nous abonner à des changements externes)
  const subscribe = () => () => {};

  // Vérifie si nous sommes côté client (hydraté)
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,  // getSnapshot côté client
    () => false  // getServerSnapshot côté serveur
  );

  // Evite les erreurs d'hydratation en rendant un skeleton jusqu'à ce que le client soit monté
  if (!mounted || isPending) return <Skeleton className="h-10 w-32 rounded-md" />;

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

