// components/providers/root-providers.tsx

"use client";

import { BetterAuthContext } from "@/lib/auth/auth-client";
import { authClient } from "@/lib/auth/auth-client";

import React from "react";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "react-hot-toast";

interface RootProvidersProps {
  /**
   * Consommation directe du type de retour du serveur.
   * Garantit une synchronisation stricte entre le backend et le frontend.
   */
  session: Awaited<ReturnType<typeof authClient.getSession>>;
  children: React.ReactNode;
}

export default function RootProvider({ children, session }: RootProvidersProps) {
  // Aucune extraction destructive. L'objet `session` reçu du serveur (qui vaut 
  // { session, user } ou null) correspond exactement à la signature attendue par le provider.
  return (
    <BetterAuthContext.Provider value={{ session }}>
      <ThemeProvider defaultTheme="system" storageKey="ui-theme">
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </ThemeProvider>
    </BetterAuthContext.Provider>
  );
}

export function UserAvatar() {
  const { data: session } = authClient.useSession();
  return <span>{session?.user.name}</span>;
}