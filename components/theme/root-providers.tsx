"use client";

import { BetterAuthContext, type Session } from "@/lib/auth/auth-client";
import { auth } from "@/lib/auth"; 

interface RootProvidersProps {
  // Utilisez le type de retour de l'API getSession pour une robustesse maximale
  session: Awaited<ReturnType<typeof auth.api.getSession>>; 
  children: React.ReactNode;
}

export function RootProviders({ children, session }: RootProvidersProps) {
  // On extrait l'objet technique session du wrapper { session, user } 
  // pour correspondre au type attendu par le Provider.
  return (
    <BetterAuthContext.Provider value={{ session: session?.session ?? null }}>
      {children}
    </BetterAuthContext.Provider>
  );
}
