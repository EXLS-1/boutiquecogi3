/**
 * =============================================================================
 * USE CATALOG PERMISSIONS - Boutiquecogi3
 * =============================================================================
 * Hook RBAC pour filtrer les produits visibles côté client.
 */

"use client";

import { useMemo } from "react";
import { CatalogProduct, RBAC_LEVELS, RbacLevel } from "@/lib/catalog/catalog-types";

interface UseCatalogPermissionsOptions {
  readonly userRbacLevel?: RbacLevel;
  readonly isAuthenticated: boolean;
}

export function useCatalogPermissions({
  userRbacLevel = RBAC_LEVELS.GUEST,
  isAuthenticated,
}: UseCatalogPermissionsOptions) {
  const canViewProduct = useMemo(() => {
    return (product: CatalogProduct): boolean => {
      if (product.requiresAuth && !isAuthenticated) return false;
      return userRbacLevel <= product.minRbacLevel;
    };
  }, [userRbacLevel, isAuthenticated]);

  const filterProducts = useMemo(() => {
    return (products: readonly CatalogProduct[]): readonly CatalogProduct[] => {
      return products.filter(canViewProduct);
    };
  }, [canViewProduct]);

  return {
    canViewProduct,
    filterProducts,
  };
}