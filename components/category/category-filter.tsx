/**
 * =============================================================================
 * CATEGORY FILTER - Boutiquecogi3
 * =============================================================================
 * Filtre de catégories avec URL state management.
 * Support multi-sélection, reset, et persistance des autres params (q, page...).
 */

"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface CategoryFilterProps {
  readonly categories: readonly string[];
  readonly className?: string;
}

/**
 * Utilitaire de création d'URL (fallback si @/lib/utils/utils non dispo)
 */
function createUrl(pathname: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function CategoryFilter({ categories, className = "" }: CategoryFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Catégorie active depuis l'URL
  const activeCategory = searchParams.get("category") || "all";

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleCategoryChange = useCallback(
    (category: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (category === "all") {
        params.delete("category");
      } else {
        params.set("category", category);
      }

      // Reset pagination lors du changement de filtre
      params.delete("page");

      router.push(createUrl(pathname, params), { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleClearFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    params.delete("page");
    router.push(createUrl(pathname, params), { scroll: false });
  }, [pathname, router, searchParams]);

  // ─── Render ───────────────────────────────────────────────────────────────
  const isFiltered = activeCategory !== "all";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Label + Clear */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Filtrer par catégorie
        </span>
        {isFiltered && (
          <button
            onClick={handleClearFilter}
            className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-800 
                       transition-colors font-medium"
            aria-label="Réinitialiser le filtre"
          >
            <X className="h-3 w-3" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Pills */}
      <div 
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        role="radiogroup"
        aria-label="Filtres de catégories"
      >
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          
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
              {isActive && (
                <Badge variant="outline" className="ml-2 bg-cyan-700/20 text-white border-white/30 text-[10px]">
                  actif
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryFilter;