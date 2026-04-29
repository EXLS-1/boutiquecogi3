// components/root-providers.tsx
"use client";

import { ThemeProvider } from "@/app/provider";

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class" // OBLIGATOIRE pour une intégration native Shadcn / Tailwind
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange // Optimisation : Empêche le scintillement des transitions CSS lors du changement de thème
    >
      {children}
    </ThemeProvider>
  );
}