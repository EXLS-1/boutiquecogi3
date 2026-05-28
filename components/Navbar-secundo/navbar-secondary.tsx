// components/navbar/navbar-secondary.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/use-ui-store";
import { useSearchParams } from "next/navigation";

export type NavbarSecondaryItem = {
  label: string;
  href: string;
};

type NavbarSecondaryProps = {
  items?: NavbarSecondaryItem[];
  className?: string;
};

const DEFAULT_ITEMS: NavbarSecondaryItem[] = [
  { label: "Femme", href: "/products?category=femme" },
  { label: "Homme", href: "/products?category=homme" },
  { label: "Enfant", href: "/products?category=enfant" },
  { label: "Sacs", href: "/products?category=sac" },
  { label: "Chaussures", href: "/products?category=chaussure" },
  { label: "Accessoires", href: "/products?category=accessoire" },
];

export function NavbarSecondary({
  items = DEFAULT_ITEMS,
  className,
}: NavbarSecondaryProps) {
  const { toggleLeftSidebar, toggleRightSidebar } = useUIStore();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  // Pattern de robustesse pour éviter les erreurs d'hydratation
  // liées aux paramètres de recherche ou à l'état global.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-14 left-0 right-0 z-40 border-b border-cyan-700 bg-cyan-100 shadow-md",
        className
      )}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-2 sm:px-6 lg:px-8">
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

        <div className="flex items-center justify-center gap-1 overflow-x-auto no-scrollbar">
          {/* Bouton "Tout" : Toujours visible, actif par défaut si pas de catégorie */}
          <Button
            variant="ghost"
            asChild
            className={cn(
              "px-3 font-lato text-xs sm:text-sm uppercase tracking-wider transition-all",
              mounted && !activeCategory 
                ? "text-pink-500 underline decoration-2 underline-offset-4" 
                : "text-cyan-600 hover:text-pink-400"
            )}
          >
            <Link href="/category" className="flex items-center gap-2">
              <LayoutGrid size={14} className="hidden sm:block" />
              <span>Tout</span>
            </Link>
          </Button>

          {items.map((item) => {
            // Vérification robuste du lien actif
            const isActive = mounted && activeCategory && item.href.includes(`category=${activeCategory}`);
            
            return (
              <Button
                key={item.href}
                variant="ghost"
                asChild
                className={cn(
                  "px-3 font-lato text-xs sm:text-sm uppercase tracking-wider transition-all",
                  isActive 
                    ? "text-pink-500 underline decoration-2 underline-offset-4" 
                    : "text-cyan-600 hover:text-pink-400"
                )}
              >
                <Link href={item.href}>
                  {item.label}
                </Link>
              </Button>
            );
          })}
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
