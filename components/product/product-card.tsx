// components/product-card.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import { Product } from "@/types/products";
import { formatCurrency, CurrencyCode } from '@/lib/currency/format-currency';

interface ProductCardProps {
  product: { 
    id: string;
    name: string;
    priceUSD: number;
    priceCDF: number
    };
  activeCurrency: CurrencyCode;
}

export default function ProductCard({ product, activeCurrency }: ProductCardProps) {
  // Sélection du prix selon la devise active
  const rawPrice = activeCurrency === 'CDF' ? product.priceCDF : product.priceUSD;
  
  // Formatage strict
  const displayPrice = formatCurrency(rawPrice, activeCurrency);
    return (
    <div className="surface group flex flex-col h-full overflow-hidden">
      {/* Container Image avec Ratio fixe pour éviter le Layout Shift */}
      <div className="relative aspect-4/5 overflow-hidden bg-muted">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="badge bg-destructive text-destructive-foreground">Rupture</span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col grow gap-2">
        <h3 className="font-playfair text-cyan-500 text-lg font-bold line-clamp-1">
          {product.name}
        </h3>
        
        <div className="flex flex-col gap-1 text-rose-500">
          {/* ... */}
          <p className="text-muted...">
            {displayPrice}
          </p>
          {/* ... */}
        </div>

        <Link 
          href={`/products/${product.id}`}
          className="btn-primary mt-auto w-full justify-center text-xs uppercase tracking-widest"
        >
          Voir les détails
        </Link>
      </div>
    </div>
  );
}

ProductCard.displayName = "ProductCard";
