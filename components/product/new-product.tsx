/**
 * =============================================================================
 * NEW PRODUCT CATEGORY - Boutiquecogi3
 * =============================================================================
 * Composant dédié à l'affichage de la catégorie "Nouveautés".
 * Badge "Nouveau" intégré, style distinctif.
 * 
 */

"use client";

import { memo } from "react";
import { ProductCard } from "@/components/product/product-card";
import { useCatalogPermissions } from "@/hooks/catalog/use-catalog-permissions";
import type { CatalogProduct } from "@/lib/catalog/catalog-types";

interface RecentProductsProps {
  readonly isAuthenticated: boolean;
  readonly products?: readonly CatalogProduct[];
}

function RecentProductsComponent({
  isAuthenticated,
  products = [],
}: RecentProductsProps) {
  const { filterProducts } = useCatalogPermissions({
    isAuthenticated,
  });

  const visibleProducts = filterProducts(products);
  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 90);

  const recentProducts = visibleProducts.filter((product) => {
    const createdAt = new Date(product.createdAt);
    return createdAt >= ninetyDaysAgo && createdAt <= now;
  });

  if (recentProducts.length === 0) return null;

  return (
    <>
      {recentProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={true}
        />
      ))}
    </>
  );
}

export const RecentProducts = memo(RecentProductsComponent);
RecentProducts.displayName = "RecentProducts";

export const NewProductCategory = RecentProducts;

export default RecentProducts;
