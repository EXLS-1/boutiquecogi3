// components/product/product-list.tsx
/**
 * =============================================================================
 * PRODUCT LIST - Molécule - Boutiquecogi3
 * =============================================================================
 * Grille de produits avec gestion vide, skeleton, et pagination.
 * -- Affiche les produits sous forme de cartes avec badges et prix.
 * -- Skeleton intégré pour le chargement.
 * -- Gestion de l'état vide avec message et icône.
 * -- Accessible : rôle "list" et "listitem" pour les lecteurs d'écran.
 * -- Pagination et tri peuvent être ajoutés via props.
 */

import { memo, type ComponentProps } from "react";
import { ProductCard } from "@/components/product/product-card";
import {
  normalizeSkeletonCount,
  ProductListSkeleton,
} from "@/components/product/product-list-skeleton";

export { ProductListSkeleton } from "@/components/product/product-list-skeleton";

type Product = ComponentProps<typeof ProductCard>["product"];

interface ProductListProps {
  readonly products: readonly Product[];
  readonly totalCount: number;
  readonly pageSize?: number;
  readonly isLoading?: boolean;
}

function ProductListComponent({
  products,
  totalCount,
  pageSize = 12,
  isLoading = false,
}: ProductListProps) {
  if (isLoading) {
    return <ProductListSkeleton count={normalizeSkeletonCount(pageSize)} />;
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
          <span className="text-2xl">🔍</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucun produit trouvé</h3>
        <p className="text-slate-500 max-w-md mx-auto">
          Essayez de modifier vos filtres ou revenez plus tard pour découvrir nos nouveautés.
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      role="list"
      aria-label={`${totalCount} ${totalCount === 1 ? "produit" : "produits"}`}
    >
      {products.map((product, index) => (
        <div key={product.id} role="listitem">
          <ProductCard
            product={product}
            priority={index < 4}
          />
        </div>
      ))}
    </div>
  );
}

export const ProductList = memo(ProductListComponent);
ProductList.displayName = "ProductList";