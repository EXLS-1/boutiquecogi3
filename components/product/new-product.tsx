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
import { useFilteredCategories } from "@/hooks/category/use-category-permissions";

interface NewProductCategoryProps {
  readonly userRbacLevel?: unknown;
  readonly isAuthenticated: boolean;
}

function NewProductCategoryComponent({
  userRbacLevel,
  isAuthenticated,
}: NewProductCategoryProps) {
  // Filtrage RBAC
  const visibleCategories = useFilteredCategories(
    NEW_ARRIVAL_CATEGORIES,
    { userRbacLevel: userRbacLevel as any, isAuthenticated }
  );

  if (visibleCategories.length === 0) return null;

  const category = visibleCategories[0]; // Une seule catégorie nouveauté

  return (
    <ProductCard
      product={catalogProductFromCategory(category)}
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