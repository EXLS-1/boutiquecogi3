// components/catalog/featured-products-section.tsx
/**
 * =============================================================================
 * FEATURED PRODUCTS SECTION
 * =============================================================================
 * Section "Nos coups de cœur" affichant les produits en vedette.
 * Composant serveur avec Suspense intégré.
 */

import { Suspense } from "react";
import { ProductList } from "@/components/product/product-list";
import { ProductListSkeleton } from "../product/product-list-skeleton";
import type { CatalogProduct } from "@/lib/product-catalog/catalog-types";

interface FeaturedProductsSectionProps {
  readonly products: readonly CatalogProduct[];
}

/**
 * Section produits en vedette avec titre stylisé.
 * Affiche la grille de produits via ProductList avec fallback Suspense.
 */
export function FeaturedProductsSection({
  products,
}: FeaturedProductsSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="mt-16" aria-labelledby="featured-heading">
      <div className="flex flex-col items-center justify-center space-y-4 mb-12">
        <h2
          id="featured-heading"
          className="text-3xl md:text-4xl font-playfair font-bold uppercase text-center text-slate-900"
        >
          Nos coups de cœur
        </h2>
        <div
          className="w-24 h-1 bg-cyan-600 rounded-full"
          aria-hidden="true"
        />
      </div>

      <Suspense fallback={<ProductListSkeleton count={6} />}>
        <ProductList
          products={products}
          totalCount={products.length}
          pageSize={6}
        />
      </Suspense>
    </section>
  );
}
