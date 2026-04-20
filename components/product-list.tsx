"use client";

import { useMemo, useState } from "react";
import { Product } from "@/types/products";
import ProductCard from "@/components/product-card";

interface Props {
  products: Product[];
  title: string;
}

export const ProductList = ({ products, title }: Props) => {
   const [searchTerm, setSearchTerm] = useState("");

   // Filtrage sécurisé
   const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-playfair font-bold uppercase tracking-tight">{title}</h2>
            <div className="h-1 w-20 bg-black mt-4"></div>
          </div>

          {/* Search Bar en pur Tailwind */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-b-2 border-gray-100 focus:border-black outline-none transition-all font-lato"
            />
            <i className="fas fa-search absolute left-0 top-1/2 -translate-y-1/2 text-gray-400"></i>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};
