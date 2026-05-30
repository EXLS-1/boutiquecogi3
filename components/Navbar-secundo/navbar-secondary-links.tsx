// components/navbar-secundo/navbar-secondary-links.tsx
// Ce composant est dédié à l'affichage des liens de navigation dans la barre de navigation secondaire. Il est conçu pour être flexible et réutilisable, permettant d'afficher une liste de liens de navigation, ainsi que des actions spécifiques (comme un menu ou un panier) sans être limité à des éléments spécifiques. Contrairement à la version précédente, ce composant ne contient plus de logique spécifique à une icône de panier, ce qui le rend plus générique et adaptable à différents besoins d'interface utilisateur.
// Il utilise également Suspense pour gérer le chargement des liens de navigation de manière fluide, en affichant un squelette de chargement pendant que les données sont récupérées.

"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types/navbar-secondary";

interface NavbarSecondaryLinksContentProps {
  items: NavItem[];
}

/**
 * Extraction sûre du paramètre de catégorie depuis une URL relative.
 */
function getCategoryFromHref(href: string): string | null {
  try {
    const url = new URL(href, "http://localhost:3000");
    return url.searchParams.get("category");
  } catch {
    return null;
  }
}

function NavbarSecondaryLinksContent({ items }: NavbarSecondaryLinksContentProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const activeCategory = searchParams.get("category");

  // Le bouton "Tout" est actif uniquement si le chemin correspond exactement
  // Cela évite qu'il soit sélectionné par défaut sur la Home page par exemple.
  const isToutActive = pathname === "/products" && !activeCategory;

  return (
    <div className="flex items-center justify-center gap-1 overflow-x-auto no-scrollbar">

      {/* Catégories Dynamiques */}
      {items.map((item) => {
        const targetCategory = getCategoryFromHref(item.href);
        // Nature identique : vérification du chemin (/products) ET de la catégorie
        const isActive = 
          pathname === "/products" && activeCategory !== null && activeCategory === targetCategory;

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
            <Link href={item.href}>{item.label}</Link>
          </Button>
        );
      })}
    </div>
  );
}

/**
 * Squelette de chargement pour éviter le Layout Shift (CLS) et isoler le useSearchParams.
 */
function SecondaryLinksSkeleton() {
  return (
    <div className="flex h-9 w-full max-w-md animate-pulse items-center justify-center gap-4 rounded-md bg-cyan-200/50" />
  );
}

export function NavbarSecondaryLinks({ items }: NavbarSecondaryLinksContentProps) {
  return (
    <Suspense fallback={<SecondaryLinksSkeleton />}>
      <NavbarSecondaryLinksContent items={items} />
    </Suspense>
  );
}