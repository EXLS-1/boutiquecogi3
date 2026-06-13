// components/theme/root-providers.tsx
"use client";

import { BetterAuthContext } from "@/lib/auth/auth-client";
import type { auth } from "@/lib/auth";

interface RootProvidersProps {
  /**
   * Consommation directe du type de retour du serveur.
   * Garantit une synchronisation stricte entre le backend et le frontend.
   */
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
  children: React.ReactNode;
}

export function RootProviders({ children, session }: RootProvidersProps) {
  // Aucune extraction destructive. L'objet `session` reçu du serveur (qui vaut 
  // { session, user } ou null) correspond exactement à la signature attendue par le provider.
  return (
    <BetterAuthContext.Provider value={{ session }}>
      {children}
    </BetterAuthContext.Provider>
  );
}

export default RootProviders;