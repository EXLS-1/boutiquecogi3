// components/product-list.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./product-card";
import { Button } from "@/components/ui/button";
import { CurrencyCode } from "@/lib/currency/format-currency";
import { Product } from "@/types/products";

const PAGE_SIZE = 12;

interface ProductListProps {
  products: Product[];
  isLoading?: boolean;
  activeCurrency: CurrencyCode;
}

function getPageButtons(page: number, pageCount: number): Array<number | "ellipsis"> {
  if (pageCount <= 4) {
    return Array.from({ length: pageCount }, (_, i) => i);
  }

  const buttons: Array<number | "ellipsis"> = [0];
  const left = Math.max(1, page - 1);
  const right = Math.min(pageCount - 2, page + 1);

  if (left > 1) {
    buttons.push("ellipsis");
  }

  for (let index = left; index <= right; index += 1) {
    buttons.push(index);
  }

  if (right < pageCount - 2) {
    buttons.push("ellipsis");
  }

  buttons.push(pageCount - 1);
  return buttons;
}

export const ProductList = ({ products, isLoading, activeCurrency }: ProductListProps) => {
  const [page, setPage] = useState(0);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(products.length / PAGE_SIZE)),
    [products.length]
  );

  const pageButtons = useMemo(() => getPageButtons(page, pageCount), [page, pageCount]);

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
    <div className="space-y-16 text-cyan-400">
      <ol className="grid list-decimal list-inside grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {visibleProducts.map((product, index) => (
          <li
            key={product.id}
            value={page * PAGE_SIZE + index + 1}
            className="list-item text-rose-400"
          >
            <ProductCard
              product={product}
              activeCurrency={activeCurrency}
            />
          </li>
        ))}
      </ol>
      
      <div className="flex justify-center">
        {/* Pagination controls will be rendered here */}
      </div>
      {pageCount > 1 && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={!canPrevious}
              className="gap-2 text-cyan-400"
            >
              <ChevronLeft className="h-4 w-4 text-cyan-500" />
            </Button>

            <div className="flex flex-wrap items-center justify-center gap-1 px-2 ">
              {pageButtons.map((button, index) => (
                button === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-sm text-cyan-400">
                    …
                  </span>
                ) : (
                  <Button
                    key={button}
                    variant={button === page ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setPage(button)}
                    className={button === page ? "gap-0 bg-cyan-200 text-cyan-400" : "gap-0"}
                  >
                    {button + 1}
                  </Button>
                )
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(prev + 1, pageCount - 1))}
              disabled={!canNext}
              className="gap-2 text-cyan-400"
            >
              <ChevronRight className="h-4 w-4 text-cyan-500" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
