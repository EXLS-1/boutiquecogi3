// components/catalog/recent-products-section.tsx
/**
 * =============================================================================
 * RECENT PRODUCTS SECTION
 * =============================================================================
 * Section "Nos récentes nouveautés" avec gestion des états vide/erreur.
 * Composant serveur avec Suspense intégré.
 */

import { Suspense } from "react";
import { ProductList } from "@/components/catalog/product-list";
import { ProductListSkeleton } from "./product-list-skeleton";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import type { CatalogProduct } from "@/lib/catalog/catalog-types";

interface RecentProductsSectionProps {
  readonly products: readonly CatalogProduct[];
  readonly pageSize: number;
  readonly hasError: boolean;
  readonly errorMessage?: string;
}

/**
 * Section nouveautés avec gestion complète des états.
 * @param products — Produits récents à afficher
 * @param pageSize — Nombre de produits par page
 * @param hasError — Indique si une erreur de fetching s'est produite
 * @param errorMessage — Message d'erreur optionnel
 */
export function RecentProductsSection({
  products,
  pageSize,
  hasError,
  errorMessage = "Impossible de charger les produits. Veuillez réessayer.",
}: RecentProductsSectionProps) {
  return (
    <section className="mt-24" aria-labelledby="nouveautes-heading">
      <div className="flex flex-col items-center justify-center space-y-4 mb-12">
        <h2
          id="nouveautes-heading"
          className="text-3xl md:text-4xl font-playfair font-bold uppercase text-center text-slate-900"
        >
          Nos récentes nouveautés
        </h2>
        <div
          className="w-24 h-1 bg-cyan-600 rounded-full"
          aria-hidden="true"
        />
      </div>

      <Suspense fallback={<ProductListSkeleton count={pageSize} />}>
        {hasError ? (
          <ErrorState message={errorMessage} />
        ) : products.length === 0 ? (
          <EmptyState message="Aucun produit récent disponible pour le moment." />
        ) : (
          <ProductList
            products={products}
            totalCount={products.length}
            pageSize={pageSize}
          />
        )}
      </Suspense>
    </section>
  );
}
