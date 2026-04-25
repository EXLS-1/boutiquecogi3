"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { ReactNode } from "react";
import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <NextThemesProvider
      // Indique à next-themes d'injecter 'data-theme' pour tes variantes (turquoise/rose)
      attribute="data-theme" 
      defaultTheme="system"
      enableSystem
      // Définit les thèmes disponibles pour correspondre à ton CSS
      themes={["light", "dark", "turquoise", "rose"]}
      // Force l'utilisation de la classe 'dark' en plus de l'attribut pour Tailwind v4
      enableColorScheme
      {...props}
    >
      {children}
    </NextThemesProvider>
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
            fontSize: "14px",
            padding: "16px",
            borderRadius: "8px",
          },
          success: {
            style: {
              background: "#10b981",
            },
            iconTheme: {
              primary: "#fff",
              secondary: "#10b981",
            },
          },
          error: {
            style: {
              background: "#ef4444",
            },
            iconTheme: {
              primary: "#fff",
              secondary: "#ef4444",
            },
          },
        }}
      />
      {children}
    </SessionProvider>
  );
}
