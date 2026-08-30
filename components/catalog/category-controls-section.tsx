// components/catalog/category-controls-section.tsx
/**
 * =============================================================================
 * CATEGORY CONTROLS SECTION
 * =============================================================================
 * Barre de contrôles de la page catégorie : compteur de produits et tri.
 * Composant client (select interactif) avec navigation URL vers la même
 * catégorie en préservant le paramètre `sort`.
 */

"use client";

import { useCallback } from "react";
import {
  VALID_SORT_OPTIONS,
  SORT_LABELS,
  type SortOption,
} from "@/lib/product-catalog/catalog-page-types";

interface CategoryControlsSectionProps {
  readonly productsCount: number;
  readonly totalCount: number;
  readonly currentSort: SortOption;
  readonly categorySlug: string;
}

export function CategoryControlsSection({
  productsCount,
  totalCount,
  currentSort,
  categorySlug,
}: CategoryControlsSectionProps) {
  const handleSortChange = useCallback(
    (value: string) => {
      // Relecture des params courants depuis le navigateur pour préserver
      // les autres paramètres (catalogOption, etc.) — évite useSearchParams.
      const params = new URLSearchParams(window.location.search);
      params.set("sort", value);
      params.delete("page");
      window.location.href = `/${categorySlug}?${params.toString()}`;
    },
    [categorySlug],
  );

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
      <p className="text-sm text-slate-500" aria-live="polite">
        {productsCount} produit{productsCount > 1 ? "s" : ""} affiché
        {productsCount > 1 ? "s" : ""} sur {totalCount}
      </p>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <span className="font-medium">Tri :</span>
        <select
          value={currentSort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        >
          {VALID_SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}