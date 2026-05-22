// components/navbar/navbar-secondary.tsx
"use client";

import React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/use-ui-store";

export type NavbarSecondaryItem = {
  label: string;
  href: string;
};

type NavbarSecondaryProps = {
  items?: NavbarSecondaryItem[];
  className?: string;
};

const DEFAULT_ITEMS: NavbarSecondaryItem[] = [
  { label: "Femme", href: "/category/femme" },
  { label: "Homme", href: "/category/homme" },
  { label: "Enfant", href: "/category/enfant" },
  { label: "Sac", href: "/category/sac" },
  { label: "Chaussure", href: "/category/chaussure" },
  { label: "Accessoire", href: "/category/accessoire" },
];

export function NavbarSecondary({
  items = DEFAULT_ITEMS,
  className,
}: NavbarSecondaryProps) {
  const { toggleLeftSidebar, toggleRightSidebar } = useUIStore();

  return (
    <nav
      className={cn(
        "fixed top-14 left-0 right-0 z-40 border-b border-slate-800 bg-slate-950 shadow-md",
        className
      )}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-start">
          <button
            type="button"
            onClick={toggleLeftSidebar}
            className="rounded-md p-2 text-cyan-400 transition-colors hover:text-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label="Ouvrir le menu de navigation"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-1">
          {items.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              asChild
              className="px-3 font-lato uppercase tracking-wider text-cyan-400 transition-all hover:bg-pink-400/10 hover:text-pink-400"
            >
              <Link href={item.href}>
                {item.label}
              </Link>
            </Button>
          ))}
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={toggleRightSidebar}
            className="rounded-md p-2 text-cyan-400 transition-colors hover:text-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label="Ouvrir le panier et profil"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
    </nav>
  );
}
