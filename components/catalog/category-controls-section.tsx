// components/catalog/catalog-controls-section.tsx
/**
 * =============================================================================
 * CATEGORY CONTROLS SECTION
 * =============================================================================
 * Barre de contrôles avec compteur de produits et dropdown de tri.
 * Composant serveur — le SortDropdown est un client component encapsulé.
 */

import { Filter, SlidersHorizontal } from "lucide-react";
import { SortDropdown } from "./sort-dropdown";
import type { SortOption } from "@/lib/catalog/catalog-page-types";

interface CategoryControlsSectionProps {
  readonly productsCount: number;
  readonly totalCount: number;
  readonly currentSort: SortOption;
  readonly categorySlug: string;
}

/**
 * Barre de contrôles : titre, compteur et tri.
 */
export function CategoryControlsSection({
  productsCount,
  totalCount,
  currentSort,
  categorySlug,
}: CategoryControlsSectionProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-3">
        <Filter
          className="h-5 w-5 text-slate-500"
          aria-hidden="true"
        />
        <h2 className="text-lg font-semibold text-slate-900">Produits</h2>
        <span className="text-sm text-slate-500">
          ({productsCount} / {totalCount})
        </span>
      </div>

      <div className="flex items-center gap-2">
        <SlidersHorizontal
          className="h-4 w-4 text-slate-500"
          aria-hidden="true"
        />
        <span className="text-sm text-slate-500">Trier par:</span>
        <SortDropdown currentSort={currentSort} categorySlug={categorySlug} />
      </div>
    </div>
  );
}
