/**
 * =============================================================================
 * PRODUCT SORT FILTER - Boutiquecogi3
 * =============================================================================
 * Filtre de tri avec nuqs pour state URL type-safe.
 * Pas de useRouter/useSearchParams manuel - nuqs gère tout.
 */

"use client";

import { useQueryState, parseAsStringLiteral } from "nuqs";
import { 
  SORT_OPTIONS, 
  type SortValue 
} from "@/lib/product/product-types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

const sortValues = SORT_OPTIONS.map((o) => o.value) as [string, ...string[]];
const sortParser = parseAsStringLiteral(sortValues).withDefault("newest");

export function ProductSortFilter() {
  const [sort, setSort] = useQueryState("sort", sortParser);

  const handleSortChange = (value: SortValue) => {
    setSort(value === "newest" ? null : value, {
      shallow: false, // Déclenche re-render serveur
    });
  };

  return (
    <div className="flex items-center gap-3">
      <ArrowUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <label 
        htmlFor="sort-filter" 
        className="text-xs uppercase tracking-widest text-muted-foreground font-bold whitespace-nowrap"
      >
        Trier par
      </label>
      <Select
        value={sort}
        onValueChange={handleSortChange}
      >
        <SelectTrigger 
          id="sort-filter"
          className="h-9 w-[200px] text-sm"
          aria-label="Choisir un critère de tri"
        >
          <SelectValue placeholder="Nouveautés" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="text-sm"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default ProductSortFilter;