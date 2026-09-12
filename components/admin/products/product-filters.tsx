// components/admin/products/product-filters.tsx
"use client";
import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Filter } from "lucide-react";

interface Props { current: Record<string, string | undefined> }

export function ProductFilters({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [search, setSearch] = useState(current.search ?? "");

  const updateQuery = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value); else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateQuery("search", search);
  };

  return (
    <div className="mb-6 space-y-4">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher un produit (nom, SKU, slug)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </form>
      <div className="flex flex-wrap gap-2">
        <select onChange={(e) => updateQuery("status", e.target.value)} className="px-3 py-1 border border-slate-200 rounded text-sm">
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Brouillons</option>
          <option value="PENDING">En révision</option>
          <option value="PUBLISHED">Publiés</option>
          <option value="ARCHIVED">Archivés</option>
        </select>
        <div className="flex items-center gap-1 text-sm text-slate-600">
          <Filter className="w-4 h-4" />
          <span>Filtres actifs</span>
        </div>
      </div>
    </div>
  );
}
