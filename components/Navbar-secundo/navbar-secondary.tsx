// components/navbar-secundo/navbar-secondary.tsx
// Ce composant est dédié à l'affichage de la barre de navigation secondaire.
// Il est conçu pour être flexible et réutilisable, permettant d'afficher une liste de liens de navigation, ainsi que des actions spécifiques (comme un menu ou un panier) sans être limité à des éléments spécifiques. Contrairement à la version précédente, ce composant ne contient plus de logique spécifique à une icône de panier, ce qui le rend plus générique et adaptable à différents besoins d'interface utilisateur.

"use client";

import React from "react";
import { Settings, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { useUIStore } from "@/store/use-ui-store";
import { NavbarSecondaryTrigger } from "./navbar-secondary-trigger";
import { NavbarSecondaryLinks } from "./navbar-secondary-links";
import type { NavItem } from "@/types/navbar-secondary";

interface NavbarSecondaryProps {
  items?: NavItem[];
  className?: string;
}

const DEFAULT_ITEMS: NavItem[] = [
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

  return (
    <nav
      className={cn(
        "fixed top-14 left-0 right-0 z-40 border-b border-cyan-700 bg-cyan-100 shadow-md",
        className
      )}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-2 sm:px-6 lg:px-8">
        {/* Slot Gauche : Navigation Menu */}
        <div className="flex items-center justify-start">
          <NavbarSecondaryTrigger
            icon={Settings}
            label="Ouvrir le menu de navigation"
            onClick={toggleLeftSidebar}
          />
        </div>

        {/* Slot Central : Contenu Filtrable Autonome */}
        <NavbarSecondaryLinks items={items} />

        {/* Slot Droit : Actions Client (Icône corrigée sémantiquement) */}
        <div className="flex items-center justify-end">
          <NavbarSecondaryTrigger
            icon={LayoutGrid}
            label="Ouvrir le panier et profil"
            onClick={toggleRightSidebar}
          />
        </div>
      </div>
    </nav>
  );
}