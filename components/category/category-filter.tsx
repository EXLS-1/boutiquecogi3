// components/category-filter.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createUrl } from "@/lib/utils";

export function CategoryFilter({ categories }: { categories: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";

  const handleCategoryChange = (category: string) => {
    // 1. Créer une copie modifiable des paramètres actuels
    const params = new URLSearchParams(searchParams.toString());

    // 2. Mettre à jour la catégorie
    if (category === "all") {
      params.delete("category");
    } else {
      params.set("category", category);
    }

    // 3. Utiliser l'utilitaire pour générer la nouvelle URL en préservant 'q'
    router.push(createUrl(pathname, params), { scroll: false });
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => handleCategoryChange(cat)}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase transition-all border",
            activeCategory === cat 
              ? "bg-black text-white" 
              : "bg-white text-gray-500 hover:border-cyan-400"
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default CategoryFilter;