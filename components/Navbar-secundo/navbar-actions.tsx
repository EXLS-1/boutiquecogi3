// components/navbar/navbar-actions.tsx
"use client";

import React from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

type NavbarActionsProps = {
  children?: React.ReactNode;
  onMenuClick?: () => void;
  className?: string;
};

export function NavbarActions({
  children,
  onMenuClick,
  className,
}: NavbarActionsProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      {children}

      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-md p-2 text-cyan-400 transition-colors hover:text-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        aria-label="Ouvrir le panier et profil"
      >
        <Menu className="h-6 w-6" />
      </button>
    </div>
  );
}