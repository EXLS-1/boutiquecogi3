// app/providers.tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRef } from "react";
import { useCurrencyStore } from "@/store/use-currency-store";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<
  typeof NextThemesProvider
>) {
  return (
    <NextThemesProvider {...props}>
      {children}
    </NextThemesProvider>
  );
}

type CurrencyProviderProps = {
  children: React.ReactNode;
  initialCurrency: "USD" | "CDF";
};

export function CurrencyProvider({
  children,
  initialCurrency,
}: CurrencyProviderProps) {

  // Zustand setter pour la devise d'affichage.
  const setCurrency =
    useCurrencyStore(
      (s) => s.setDisplayCurrency
    );

  // Evite les updates répétées.
  const initialized = useRef(false);

  // Initialisation synchrone unique.
  if (!initialized.current) {
    setCurrency(initialCurrency);
    initialized.current = true;
  }

  return <>{children}</>;
}