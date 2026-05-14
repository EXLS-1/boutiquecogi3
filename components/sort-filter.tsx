// components/sort-filter.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createUrl } from "@/lib/utils";

const SORT_OPTIONS = [
  { label: "Nouveautés", value: "newest" },
  { label: "Prix : Croissant", value: "price-asc" },
  { label: "Prix : Décroissant", value: "price-desc" },
];

export function SortFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "newest";

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === "newest") {
      params.delete("sort"); // 'newest' est notre état par défaut
    } else {
      params.set("sort", value);
    }

    router.push(createUrl(pathname, params), { scroll: false });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Trier par:</span>
      <select
        value={currentSort}
        onChange={(e) => handleSortChange(e.target.value)}
        className="bg-transparent border-none text-xs font-bold uppercase tracking-widest outline-none cursor-pointer focus:ring-0"
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
