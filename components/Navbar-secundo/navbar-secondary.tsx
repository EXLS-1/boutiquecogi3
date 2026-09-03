// components/navbar-secundo/navbar-secondary.tsx
// Ce composant est dédié à l'affichage de la barre de navigation secondaire.
// Il est conçu pour être flexible et réutilisable,
// permettant d'afficher une liste de liens de navigation,
// ainsi que des actions spécifiques (comme un menu ou un panier)
// sans être limité à des éléments spécifiques.
// Le slot central affiche désormais un menu déroulant « CATEGORIES » dynamique
// (remplace les catégories codées en dur). Les slots gauche et droit restent inchangés.

"use client";

import React from "react";
import Link from "next/link";
import { Settings, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button} from "@/components/ui/button"
import { useUIStore } from "@/store/use-ui-store";
import { NavbarSecondaryTrigger } from "./navbar-secondary-trigger";
import { NavbarCategoriesMenu } from "./navbar-categories-menu";

interface NavbarSecondaryProps {
  className?: string;
}

export function NavbarSecondary({ className }: NavbarSecondaryProps) {
  const { toggleLeftSidebar, toggleRightSidebar } = useUIStore();

  return (
    <nav
      className={cn(
        "fixed top-14 left-0 right-0 z-40 border-b border-cyan-700 bg-cyan-100 shadow-md",
        className
      )}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_auto_auto] items-center justify-between gap-4 px-4 py-2">
        {/* Slot Gauche : Navigation Menu */}
        <div className="flex items-center justify-start">
          <NavbarSecondaryTrigger
            icon={Settings}
            label="Ouvrir le menu de navigation"
            onClick={toggleLeftSidebar}
          />
        </div>

        <div className="gap-10">
          <Button
            variant="ghost"
            asChild
            className="px-1 font-lato text-xs uppercase tracking-wider transition-all text-cyan-600 hover:text-pink-400"
          >
            <Link href="/" aria-label="Voir la page d'accueil et tous les nouveaux produits">
              Acceuil
            </Link>
          </Button>
          {/* Slot Central : Menu « CATEGORIES » dynamique (remplace les liens en dur) */}
          <NavbarCategoriesMenu />

          {/* Liens « PROMOTIONS » et « NOUVEAUTÉS » — mêmes caractéristiques que « Catégories » */}
          <Button
            variant="ghost"
            asChild
            className="px-1 font-lato text-xs uppercase tracking-wider transition-all text-cyan-600 hover:text-pink-400"
          >
            <Link href="/promotions" aria-label="Voir tous les produits en promotion">
              Promotions
            </Link>
          </Button>
          <Button
            variant="ghost"
            asChild
            className="px-1 font-lato text-xs uppercase tracking-wider transition-all text-cyan-600 hover:text-pink-400"
          >
            <Link href="/nouveautes" aria-label="Voir tous les nouveaux produits">
              Nouveautés
            </Link>
          </Button>
        </div>

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