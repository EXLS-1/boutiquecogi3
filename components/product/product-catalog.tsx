/**
 * =============================================================================
 * PRODUCT CATALOG - Organisme - Boutiquecogi3
 * =============================================================================
 * Section catalog complète avec filtres URL-driven.
 * Server Component : reçoit les données, délègue l'interactivité.
 */

import { ProductList } from "@/components/product/product-list";
import { ProductSortFilter } from "@/components/product/product-sort-filter";
import { ProductCategoryFilter } from "@/components/product/product-category-filter";
import { Product } from "@/lib/product/product-types";

interface ProductCatalogProps {
  readonly products: readonly Product[];
  readonly totalCount: number;
  readonly categories: readonly string[];
  readonly title: string;
  readonly pageSize?: number;
}

export default function ProductCatalog({
  products,
  totalCount,
  categories,
  title,
  pageSize = 12,
}: ProductCatalogProps) {
  return (
    <section 
      className="py-16 bg-background"
      aria-labelledby="catalog-title"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ─── Header ───────────────────────────────────────────────────────── */}
        <header className="space-y-8 mb-10">
          <h2 
            id="catalog-title"
            className="text-3xl font-playfair font-bold uppercase text-foreground"
          >
            {title}
          </h2>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-y border-border py-4 bg-muted/10 px-4 rounded-lg">
            <ProductCategoryFilter categories={categories} />
            <ProductSortFilter />
          </div>
        </header>

        {/* ─── Résultats ──────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>{totalCount} produit{totalCount > 1 ? "s" : ""}</span>
        </div>

        <ProductList 
          products={products} 
          totalCount={totalCount}
          pageSize={pageSize}
        />
      </div>
    </section>
  );
}