// components/theme/theme-provider.tsx
"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrencyStore } from "@/store/use-currency-store";

export type Theme = "light" | "dark" | "system" | "turquoise" | "rose";

export interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: "class" | "data-theme" | string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  themes?: Theme[];
  storageKey?: string;
}

const ThemeContext = React.createContext<{
  theme: Theme;
  resolvedTheme: string;
  systemTheme: string;
  themes: Theme[];
  setTheme: (theme: Theme) => void;
} | null>(null);

const DEFAULT_THEMES: Theme[] = ["light", "dark", "turquoise", "rose"];
const STORAGE_KEY = "theme";

function getSystemTheme() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(attribute: string, value: string, themes: string[]) {
  const htmlElement = document.documentElement;

  if (attribute === "class") {
    htmlElement.classList.remove(...themes.filter(Boolean));
    htmlElement.classList.add(value);
    return;
  }

  htmlElement.setAttribute(attribute, value);
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  themes = DEFAULT_THEMES,
  storageKey = STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<string>("light");

  const resolvedTheme = useMemo(() => {
    if (theme === "system") {
      return systemTheme;
    }
    return theme;
  }, [theme, systemTheme]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(storageKey) as Theme | null;
    const initialTheme = (savedTheme ?? defaultTheme) as Theme;
    const currentSystemTheme = getSystemTheme();

    setSystemTheme(currentSystemTheme);
    setThemeState(initialTheme);
    applyTheme(attribute, initialTheme === "system" && enableSystem ? currentSystemTheme : initialTheme, themes);
  }, [attribute, defaultTheme, enableSystem, storageKey, themes]);

  useEffect(() => {
    if (!enableSystem) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => {
      const nextSystemTheme = getSystemTheme();
      setSystemTheme(nextSystemTheme);

      if (theme === "system") {
        applyTheme(attribute, nextSystemTheme, themes);
      }
    };

    mediaQuery.addEventListener?.("change", updateSystemTheme);
    updateSystemTheme();

    return () => {
      mediaQuery.removeEventListener?.("change", updateSystemTheme);
    };
  }, [attribute, enableSystem, theme, themes]);

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme);
      window.localStorage.setItem(storageKey, nextTheme);

      const finalValue = nextTheme === "system" && enableSystem ? systemTheme : nextTheme;
      applyTheme(attribute, finalValue, themes);
    },
    [attribute, enableSystem, storageKey, systemTheme, themes]
  );

  const contextValue = useMemo(
    () => ({
      theme,
      resolvedTheme,
      systemTheme,
      themes,
      setTheme,
    }),
    [theme, resolvedTheme, systemTheme, themes, setTheme]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

type CurrencyProviderProps = {
  children: React.ReactNode;
  initialCurrency: "USD" | "CDF";
};

export function CurrencyProvider({
  children,
  initialCurrency,
}: CurrencyProviderProps) {
  const setCurrency = useCurrencyStore((s) => s.setDisplayCurrency);
  const [initialized, setInitialized] = useState(false);

  if (!initialized) {
    setCurrency(initialCurrency);
    setInitialized(true);
  }

  return <>{children}</>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
