// components/product-card.tsx
"use client";

import { useState } from "react";

type Product = {
  id: string | number;
  name?: string;
};

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group relative bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-lg transition">
      <div className="text-lg font-semibold">{product.name}</div>
    </div>
  );
}

export default function ProductList({ products, title }: { products: Product[]; title: string }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = (products || []).filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="py-14 bg-white" id="catalog">
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          
          <div>
            <h2 className="text-2xl md:text-4xl font-playfair font-bold uppercase tracking-tight">
              {title}
            </h2>
            <div className="h-1 w-20 bg-black mt-4"></div>
          </div>
          
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

      </div>
      
    </section>
  );
};