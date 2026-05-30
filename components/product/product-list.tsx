// components/product/product-list.tsx

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./product-card";
import { Product } from "@/types/products";

interface ProductListProps {
  products: Product[];
  totalCount: number; // Fourni par la DB
  pageSize?: number;
}

export const ProductList = ({ products, totalCount, pageSize = 12 }: ProductListProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentPage = Number(searchParams.get("page")) || 1;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", newPage.toString());
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: true });
  };

  if (!products.length) {
    return (
      <div className="py-24 text-center border rounded-lg bg-muted/20">
        <p className="text-muted-foreground text-lg">Aucun article ne correspond à votre recherche.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-8 border-t">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="inline-flex items-center justify-center rounded-md h-9 w-9 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none"
            aria-label="Page précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="text-sm font-medium mx-4">
            Page {currentPage} sur {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="inline-flex items-center justify-center rounded-md h-9 w-9 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none"
            aria-label="Page suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
