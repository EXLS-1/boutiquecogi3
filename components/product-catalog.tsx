"use client";

import { useMemo, useState } from "react";
import { Product } from "@/types/products";
import { ProductList } from "@/components/product-list";

interface Props {
  products: Product[];
  title: string;
}

export default function ProductCatalog({ products, title }: Props) {
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ["all", ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (category === "all") return products;
    return products.filter(p => p.category === category);
  }, [products, category]);

  return (
    <section>
      {/* Filtres catégorie */}
      <div className="flex gap-4 justify-center mb-10 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-6 py-2 uppercase text-sm font-bold border
              ${category === cat
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-gray-100"
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <ProductList
        title={title}
        products={filteredProducts}
      />
    </section>
  );
}