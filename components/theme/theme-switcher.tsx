// This component is adapted from the one in the shadcn/ui template, with some custom themes added.
// Source: https://github.com/shadcn/ui/blob/main/apps/www/components/theme-switcher.tsx
// components/theme/theme-switcher.tsx

"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heart, Laptop, Moon, Sparkles, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { useEffect, useState } from "react";

const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const currentTheme = theme ?? "system";

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="w-9 h-9" disabled aria-hidden="true">
        <div className="w-4 h-4" />
      </Button>
    );
  }

  const ICON_SIZE = 16;

  const currentIcon = (() => {
    switch (currentTheme) {
      case "light":
        return <Sun size={ICON_SIZE} className="text-muted-foreground" />;
      case "dark":
        return <Moon size={ICON_SIZE} className="text-muted-foreground" />;
      case "turquoise":
        return <Sparkles size={ICON_SIZE} className="text-muted-foreground" />;
      case "rose":
        return <Heart size={ICON_SIZE} className="text-muted-foreground" />;
      default:
        return <Laptop size={ICON_SIZE} className="text-muted-foreground" />;
    }
  })();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Changer le thème">
          {currentIcon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-content" align="start">
        <DropdownMenuRadioGroup
          value={currentTheme}
          onValueChange={(value) => setTheme(value)}
        >
          <DropdownMenuRadioItem className="flex gap-2" value="light">
            <Sun size={ICON_SIZE} className="text-muted-foreground" />
            <span>Light</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex gap-2" value="dark">
            <Moon size={ICON_SIZE} className="text-muted-foreground" />
            <span>Dark</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex gap-2" value="turquoise">
            <Sparkles size={ICON_SIZE} className="text-muted-foreground" />
            <span>Turquoise</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex gap-2" value="rose">
            <Heart size={ICON_SIZE} className="text-muted-foreground" />
            <span>Rose</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex gap-2" value="system">
            <Laptop size={ICON_SIZE} className="text-muted-foreground" />
            <span>System</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { ThemeSwitcher };
