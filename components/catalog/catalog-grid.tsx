// components/catalog/catalog-grid.tsx
/**
 * =============================================================================
 * CATEGORY GRID - Molécule - Boutiquecogi3
 * =============================================================================
 * Grille responsive pour l'affichage des cartes de produit suivant les categories,
 * Gère la disposition, le spacing et les breakpoints.
 */

import { memo, ReactNode } from "react";

// Local fallback default grid config (module did not export DEFAULT_GRID_CONFIG)
const DEFAULT_GRID_CONFIG = {
  columns: { mobile: 1, tablet: 2, desktop: 3 },
  gap: "1rem",
} as const;

interface CatalogGridProps {
  readonly children: ReactNode;
  readonly config?: Partial<typeof DEFAULT_GRID_CONFIG>;
  readonly className?: string;
}

function CatalogGridComponent({
  children,
  config = {},
  className = "",
}: CatalogGridProps) {
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

export const CatalogGrid = memo(CatalogGridComponent);
CatalogGrid.displayName = "CatalogGrid";