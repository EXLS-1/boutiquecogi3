'use client'

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return (
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
  )
}
