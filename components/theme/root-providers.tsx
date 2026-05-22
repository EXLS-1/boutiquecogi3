"use client";

import { ReactNode } from "react";

interface RootProvidersProps {
  children: ReactNode;
}

export function RootProviders({ children }: RootProvidersProps) {
  return <>{children}</>;
}
