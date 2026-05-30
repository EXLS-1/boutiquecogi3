// components/product/product-sort-filter.tsx

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const SORT_OPTIONS = [
  { label: "Nouveautés", value: "newest" },
  { label: "Prix : Croissant", value: "price-asc" },
  { label: "Prix : Décroissant", value: "price-desc" },
];

export function ProductSortFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "newest";

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    
    // Réinitialise la page à 1 lors d'un changement de tri
    params.delete("page");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="sort-filter" className="text-xs uppercase tracking-widest text-muted-foreground font-bold whitespace-nowrap">
        Trier par :
      </label>
      <select
        id="sort-filter"
        value={currentSort}
        onChange={handleSortChange}
        className="h-9 w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}