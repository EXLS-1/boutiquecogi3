// components/product/product-catalog.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Product } from "@/types/products";
import { ProductList } from "@/components/product/product-list";
import { ProductSortFilter } from "@/components/product/product-sort-filter";
import { CategoryFilter } from "@/components/category/category-filter";
import { CurrencyCode } from "@/lib/currency/format-currency";

export default function ProductCatalog({ products, title, activeCurrency }: { 
  products: Product[],
  title: string,
  activeCurrency: CurrencyCode
}) {
  const searchParams = useSearchParams();
  
  const categories = useMemo(() => {
    const unique = new Set(products.map(p => p.category));
    return ["all", ...Array.from(unique)];
  }, [products]);

  const query = searchParams.get("q")?.toLowerCase() || "";
  const category = searchParams.get("category") || "all";
  const sort = searchParams.get("sort") || "newest";

  // Pipeline de traitement des données : Filtrage puis Tri
  const processedProducts = useMemo(() => {
    // 1. Filtrage
    let result = products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(query) || 
                            p.description.toLowerCase().includes(query);
      const matchesCategory = category === "all" || p.category === category;
      return matchesSearch && matchesCategory;
    });

    // 2. Tri (Immuable avec [...result])
   return [...result].sort((a, b) => {
    // Utilise la devise active pour le tri de prix
    const priceA = activeCurrency === 'CDF' ? a.priceCDF : a.priceUSD;
    const priceB = activeCurrency === 'CDF' ? b.priceCDF : b.priceUSD;

    switch (sort) {
      case "price-asc": return priceA - priceB;
      case "price-desc": return priceB - priceA;
      case "newest": default: return b.id.localeCompare(a.id);
    }
  });
  }, [products, query, category, sort]);

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <header className="space-y-8 mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h2 className="text-3xl font-playfair font-bold uppercase">{title}</h2>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-y border-gray-100 py-4">
            <CategoryFilter categories={categories} />
            <ProductSortFilter />

          </div>
        </header>

        <ProductList products={processedProducts} activeCurrency={activeCurrency} />
    
      </div>
    </section>
  );
}
