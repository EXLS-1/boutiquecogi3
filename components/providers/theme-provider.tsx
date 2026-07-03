// components/providers/theme-provider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";


export type Theme = "light" | "dark" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | null>(null);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  const markMounted = useCallback(() => {
    setMounted(true);
  }, []);


  // Récupération sécurisée du thème stocké après le montage client
  useEffect(() => {
    const storedTheme = localStorage.getItem(storageKey);

    // Validation simple (évite d'appliquer des valeurs non prévues)
    const isValidTheme =
      storedTheme === "light" || storedTheme === "dark" || storedTheme === "system";

    // Déférer les mises à jour pour éviter un setState synchronously dans le body de l'effet
    if (isValidTheme) {
      const themeValue = storedTheme as Theme;
      queueMicrotask(() => {
        setThemeState(themeValue);
        setMounted(true);
      });
    } else {
      queueMicrotask(() => {
        markMounted();
      });
    }

  }, [storageKey, markMounted]);

  // Mutation synchrone du DOM pour appliquer la classe CSS globale

  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme, mounted]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme);
      setThemeState(newTheme);
    },
    [storageKey]
  );

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeProviderContext.Provider value={value}>
      {/* Empêche les sauts de style visuels avant que le composant ne soit monté */}
      <div className={mounted ? "h-full visible" : "h-full invisible"}>
        {children}
      </div>
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    throw new Error("useTheme doit être impérativement utilisé au sein d'un ThemeProvider.");
  }
  return context;
}