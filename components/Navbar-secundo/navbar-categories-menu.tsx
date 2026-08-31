// components/Navbar-secundo/navbar-categories-menu.tsx
// =============================================================================
// MENU DÉROULANT « CATEGORIES » — dynamique, robuste, multi-colonnes
// =============================================================================
// - Charge dynamiquement toutes les catégories de produits via la Server Action
//   getCategories() (lib/actions/category.actions.ts → { id, name, slug }[]).
// - Trie par ordre alphaBÉTIQUE croissant (localeCompare, sensible aux accents).
// - Répartition automatique en colonnes selon le nombre total :
//      0–7  éléments →  1 colonne
//      8–16 éléments →  2 colonnes
//     17–24 éléments →  3 colonnes
//     25–32 éléments →  4 colonnes
//     33–40 éléments →  5 colonnes
// - Déploiement HORIZONTAL plafonné au nombre maximum de colonnes (MAX_COLUMNS) :
//   au-delà de 40 éléments, la largeur ne croît plus, la hauteur prend le relais.
// - Déploiement VERTICAL plafonné à la colonne la plus remplie :
//   hauteur = (nombre d'éléments le + élevé d'une colonne) × ROW_HEIGHT_PX.
// =============================================================================

"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCategories } from "@/lib/actions/category.actions";

/** Nombre maximum de colonnes autorisé (plafond du déploiement HORIZONTAL). */
const MAX_COLUMNS = 5;
/** Largeur approximative d'une colonne de menu (en px). */
const COLUMN_WIDTH_PX = 220;
/** Hauteur approximative d'une ligne d'élément (en px). */
const ROW_HEIGHT_PX = 36;

interface Category {
  id: string;
  name: string;
  slug: string;
}

/**
 * Nombre « naturel » de colonnes selon les paliers demandés (avant plafond).
 * 0–7 → 1 · 8–16 → 2 · 17–24 → 3 · 25–32 → 4 · 33–40 → 5 · puis +1 / 8.
 */
function computeColumnCount(count: number): number {
  if (count <= 0) return 1;
  if (count <= 7) return 1;
  // ≥ 8 éléments : on passe à 2 colonnes, puis +1 colonne toutes les 8 éléments.
  return Math.max(2, Math.ceil(count / 8));
}

/**
 * Répartit les éléments (déjà triés) en N colonnes au maximum équilibrées,
 * en préservant l'ordre alphabétique (remplissage colonne par colonne).
 */
function chunkIntoColumns<T>(items: T[], columnCount: number): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  if (items.length === 0) return columns;

  const base = Math.floor(items.length / columnCount);
  const extra = items.length % columnCount;

  let index = 0;
  for (let col = 0; col < columnCount; col++) {
    const size = base + (col < extra ? 1 : 0);
    columns[col] = items.slice(index, index + size);
    index += size;
  }
  return columns;
}

export function NavbarCategoriesMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  // Chargement des catégories une seule fois au montage (Server Action).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getCategories();
        if (cancelled) return;
        if (res.success) {
          // Tri alphaBÉTIQUE croissant (accents gérés via localeCompare).
          const sorted = [...res.data].sort((a, b) =>
            a.name.localeCompare(b.name, "fr", { sensitivity: "base" }),
          );
          setCategories(sorted);
          setStatus("ready");
        } else {
          setError(res.error || "Impossible de charger les catégories.");
          setStatus("error");
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Erreur de chargement.");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Nombre de colonnes effectives : « naturel » mais plafonné (déploiement HORIZONTAL borné).
  const naturalColumnCount = computeColumnCount(categories.length);
  const columnCount = Math.max(1, Math.min(naturalColumnCount, MAX_COLUMNS));
  const columns = useMemo(
    () => chunkIntoColumns(categories, columnCount),
    [categories, columnCount],
  );
  const hasCategories = categories.length > 0;

  // Nombre le plus élevé d'éléments présents dans une colonne (colonne la plus remplie).
  const maxItemsPerColumn = hasCategories
    ? Math.max(...columns.map((col) => col.length))
    : 0;

  // Dimensions bornées du panneau :
  //  - largeur  ≤ MAX_COLUMNS × largeur unité
  //  - hauteur  ≤ (éléments max d'une colonne) × hauteur ligne
  const menuStyle: React.CSSProperties | undefined = hasCategories
    ? {
        maxWidth: columnCount * COLUMN_WIDTH_PX,
        maxHeight: Math.max(maxItemsPerColumn, 1) * ROW_HEIGHT_PX,
      }
    : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="px-3 font-lato text-xs uppercase tracking-wider transition-all text-cyan-600 hover:text-pink-400 data-open:bg-accent data-open:text-pink-500"
          aria-label="Voir toutes les catégories de produits"
        >
          Catégories
          <ChevronDown className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        style={menuStyle}
        className="min-w-56 rounded-md border border-cyan-700/20 bg-white p-2 shadow-lg"
      >
        {status === "loading" && (
          <div className="grid min-h-16 place-items-center px-4 py-3">
            <div className="h-4 w-28 animate-pulse rounded bg-cyan-200/60" />
          </div>
        )}

        {status === "error" && (
          <p className="px-4 py-3 text-sm text-destructive">{error}</p>
        )}

        {status === "ready" && !hasCategories && (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            Aucune catégorie disponible.
          </p>
        )}

        {hasCategories && (
          <div className="flex gap-6">
            {columns.map((column, colIndex) => (
              <ul
                key={colIndex}
                className="flex flex-col gap-0.5 whitespace-nowrap"
              >
                {column.map((category) => (
                  <li key={category.id}>
                    <DropdownMenuItem asChild className="!px-2 !py-1.5">
                      <Link
                        href={`/products?category=${category.slug}`}
                        className="block w-full text-left font-lato text-sm text-cyan-700 transition-colors hover:text-pink-500"
                      >
                        {category.name}
                      </Link>
                    </DropdownMenuItem>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}