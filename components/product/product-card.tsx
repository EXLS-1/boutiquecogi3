// components/product/product-card.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import { Product } from "@/types/products";
import { formatPriceUSD } from '@/lib/currency/format-currency';
import { useCurrencyStore } from "@/store/use-currency-store";

interface ProductCardProps {
  product: Pick<Product, 'id' | 'name' | 'priceUSD' | 'priceCDF' | 'image' | 'stock'>;
}

const ProductCardComponent = ({ product }: ProductCardProps) => {
  const { activeCurrency } = useCurrencyStore();
  
  const rawPrice = activeCurrency === 'CDF' ? product.priceCDF : product.priceUSD;
  const displayPrice = formatPriceUSD(rawPrice);

  return (
    <div className="surface group flex flex-col h-full overflow-hidden border border-border rounded-lg bg-card text-card-foreground shadow-sm">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        <Image
          src={product.image}
          alt={`Image de ${product.name}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105 will-change-transform"
          loading="lazy"
        />
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
            <span className="badge bg-destructive text-destructive-foreground px-3 py-1 text-sm font-semibold uppercase tracking-wider rounded-md">
              Rupture
            </span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col grow gap-3">
        <h3 className="font-playfair text-cyan-600 text-lg font-bold line-clamp-1" title={product.name}>
          {product.name}
        </h3>
        
        <div className="flex flex-col gap-1 mt-auto">
          <p className="text-rose-500 font-bold text-xl tracking-tight">
            {displayPrice} <span className="text-sm font-normal text-muted-foreground">{activeCurrency}</span>
          </p>
        </div>

        <Link 
          href={`/products/${product.id}`}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 mt-4 w-full uppercase tracking-widest"
          prefetch={false}
        >
          Voir les détails
        </Link>
      </div>
    </div>
  );
};

export const ProductCard = memo(ProductCardComponent);
