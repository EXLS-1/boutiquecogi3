/**
 * =============================================================================
 * CATEGORY GRID - Molécule - Boutiquecogi3
 * =============================================================================
 * Grille responsive pour l'affichage des cartes de produit suivant les categories,
 * Gère la disposition, le spacing et les breakpoints.
 */

import { memo, ReactNode } from "react";
import { CategoryGridConfig, DEFAULT_GRID_CONFIG } from "@/lib/category/category-constants";

interface CategoryGridProps {
  readonly children: ReactNode;
  readonly config?: Partial<CategoryGridConfig>;
  readonly className?: string;
}

function CategoryGridComponent({
  children,
  config = {},
  className = "",
}: CategoryGridProps) {
  const mergedConfig = { ...DEFAULT_GRID_CONFIG, ...config };
  const { columns, gap } = mergedConfig;

  // Construction dynamique des classes de grille
  const gridClasses = `
    grid
    grid-cols-${columns.mobile}
    sm:grid-cols-${columns.tablet}
    lg:grid-cols-${columns.desktop}
    gap-[${gap}]
    ${className}
  `;

  return (
    <div 
      className={gridClasses}
      role="list"
      aria-label="Liste des catégories"
    >
      {children}
    </div>
  );
}

export const CategoryGrid = memo(CategoryGridComponent);
CategoryGrid.displayName = "CategoryGrid";