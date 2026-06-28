/**
 * =============================================================================
 * SORT DROPDOWN (Client Component)
 * =============================================================================
 * Dropdown de tri côté client via navigation URL (reload côté serveur).
 * Nécessite "use client" pour l'interaction onChange.
 */

"use client";

import { VALID_SORT_OPTIONS, SORT_LABELS } from "@/lib/catalog/catalog-page-types";
import type { SortOption } from "@/lib/catalog/catalog-page-types";

interface SortDropdownProps {
  readonly currentSort: SortOption;
  readonly categorySlug: string;
}

/**
 * Dropdown de tri avec navigation via URL params.
 * @param currentSort — Option de tri actuellement active
 * @param categorySlug — Slug de la catégorie pour la navigation
 */
export function SortDropdown({ currentSort, categorySlug }: SortDropdownProps) {
  const handleChange = (value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("sort", value);
    window.location.href = url.toString();
  };

  return (
    <div className="relative">
      <select
        name="sort"
        defaultValue={currentSort}
        onChange={(e) => handleChange(e.target.value)}
        className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent cursor-pointer"
        aria-label="Trier les produits"
      >
        {VALID_SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {SORT_LABELS[option]}
          </option>
        ))}
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
          className="h-4 w-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}
