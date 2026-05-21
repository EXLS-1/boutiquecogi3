// components/product-list.tsx
"use client";

import ProductCard from "./product-card";
import { CurrencyCode } from "@/lib/format-currency";
import { Product } from "@/types/products";

interface ProductListProps {
  products: Product[];
  isLoading?: boolean;
  activeCurrency: CurrencyCode;
}

export const ProductList = ({ products, isLoading, activeCurrency }: ProductListProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="surface aspect-4/5 animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground font-lato">Aucun article ne correspond à votre recherche.</p>
      </div>
    );
  }

  return (
    <div className="grid  grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {products.map((product) => (
        <ProductCard 
          key={product.id} 
          product={product} 
          activeCurrency={activeCurrency} // <--- TRANSMISSION
        />
      ))}
    </div>
  );
};