// components/product-list.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./product-card";
import { Button } from "@/components/ui/button";
import { CurrencyCode } from "@/lib/format-currency";
import { Product } from "@/types/products";

const PAGE_SIZE = 12;

interface ProductListProps {
  products: Product[];
  isLoading?: boolean;
  activeCurrency: CurrencyCode;
}

export const ProductList = ({ products, isLoading, activeCurrency }: ProductListProps) => {
  const [page, setPage] = useState(0);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(products.length / PAGE_SIZE)),
    [products.length]
  );

  const visibleProducts = useMemo(
    () => products.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [page, products]
  );

  const canPrevious = page > 0;
  const canNext = page + 1 < pageCount;

  useEffect(() => {
    if (page >= pageCount) {
      setPage(0);
    }
  }, [page, pageCount]);

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
    <div className="space-y-6">
      <ol className="grid list-decimal list-inside grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {visibleProducts.map((product, index) => (
          <li
            key={product.id}
            value={page * PAGE_SIZE + index + 1}
            className="list-item"
          >
            <ProductCard
              product={product}
              activeCurrency={activeCurrency}
            />
          </li>
        ))}
      </ol>

      {pageCount > 1 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Page {page + 1} sur {pageCount} ({products.length} articles)
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={!canPrevious}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(prev + 1, pageCount - 1))}
              disabled={!canNext}
              className="gap-2"
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
