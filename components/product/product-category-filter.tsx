/**
 * =============================================================================
 * PRODUCT CATEGORY FILTER - Boutiquecogi3
 * =============================================================================
 * Filtre de catégories avec nuqs. Remplace l'import incorrect
 * depuis category/new-product.
 */

"use client";

import { useQueryState, parseAsString } from "nuqs";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ProductCategoryFilterProps {
  readonly categories: readonly string[];
  readonly className?: string;
}

export function ProductCategoryFilter({
  categories,
  className = "",
}: ProductCategoryFilterProps) {
  const [category, setCategory] = useQueryState(
    "category",
    parseAsString.withDefault("all")
  );

  const handleCategoryChange = (cat: string) => {
    setCategory(cat === "all" ? null : cat, { shallow: false });
  };

  const handleClear = () => {
    setCategory(null, { shallow: false });
  };

  const isFiltered = category !== "all";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Catégories
        </span>
        {isFiltered && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-800 transition-colors font-medium"
            aria-label="Réinitialiser le filtre catégorie"
          >
            <X className="h-3 w-3" />
            Réinitialiser
          </button>
        )}
      </div>

      <div 
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        role="radiogroup"
        aria-label="Filtrer par catégorie"
      >
        {categories.map((cat) => {
          const isActive = category === cat;
          return (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              role="radio"
              aria-checked={isActive}
              className={cn(
                "px-4 py-2 text-xs font-bold uppercase transition-all border rounded-lg",
                "whitespace-nowrap select-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
                isActive
                  ? "bg-cyan-600 border-cyan-600 text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
              )}
            >
              {cat === "all" ? "Tout" : cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ProductCategoryFilter;