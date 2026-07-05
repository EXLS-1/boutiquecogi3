/**
 * =============================================================================
 * NEW PRODUCT CATEGORY - Boutiquecogi3
 * =============================================================================
 * Composant dédié à l'affichage de la catégorie "Nouveautés".
 * Badge "Nouveau" intégré, style distinctif.
 */

"use client";

import { memo } from "react";
import { ProductCard } from "@/components/product/product-card";
import { NEW_ARRIVAL_CATEGORIES } from "@/lib/category/category-constants";
import { useCatalogPermissions } from "@/hooks/catalog/use-catalog-permissions";

interface NewProductCategoryProps {
  readonly isAuthenticated: boolean;
  readonly products: readonly any[];
}

function NewProductCategoryComponent({
  isAuthenticated,
  products = [],
}: NewProductCategoryProps) {
  // Filtrage RBAC
  const { filterProducts } = useCatalogPermissions({
    isAuthenticated,
  });

  const visibleProducts = filterProducts(products);

  const newArrivalProducts = visibleProducts.filter((product) =>
    NEW_ARRIVAL_CATEGORIES.includes((product as any).category),
  );

  if (newArrivalProducts.length === 0) return null;

  const product = newArrivalProducts[0]; // Un seul produit nouveauté

  return (
    <ProductCard
      product={product}
      badge="NOUVEAU"
      badgeVariant="default"
      priority={true} // LCP critique
      aspectRatio="16/9" // Format plus large pour mettre en valeur
      className="border-amber-200 hover:border-amber-400/50"
    />
  );
}

export const NewProductCategory = memo(NewProductCategoryComponent);
NewProductCategory.displayName = "NewProductCategory";