"use client";

import { ReactNode } from "react";
import { BetterAuthContext, type Session } from "@/lib/auth/auth-client";

interface RootProvidersProps {
  children: ReactNode;
  session?: Session | null;
}

export function RootProviders({ children, session }: RootProvidersProps) {
  return (
    <BetterAuthContext.Provider value={{ session }}>
      {children}
    </BetterAuthContext.Provider>
  );
}
