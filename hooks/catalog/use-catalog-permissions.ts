// hooks/use-catalog-permissions.ts
/**
 * Ce hook permet de filtrer les produits du catalogue en fonction des permissions RBAC de l'utilisateur.
 * Il prend en compte :
 * - Le niveau RBAC de l'utilisateur (userRbacLevel)
 * - Si l'utilisateur est authentifié (isAuthenticated)
 * - Les permissions spécifiques de l'utilisateur (userPermissions)
 */

"use client";

import { useMemo } from "react";
import { CatalogProduct, RBAC_LEVELS, RbacLevel } from "@/lib/catalog/catalog-types";

interface UseCatalogPermissionsOptions {
  readonly userRbacLevel?: RbacLevel;
  readonly isAuthenticated: boolean;
  readonly userPermissions?: readonly string[];
}

export function useCatalogPermissions({
  userRbacLevel = RBAC_LEVELS.GUEST,
  isAuthenticated,
  userPermissions = [],
}: UseCatalogPermissionsOptions) {
  const canViewProduct = useMemo(() => {
    return (product: CatalogProduct): boolean => {
      const policy = product.accessPolicy;

      // Vérification authentification
      if (policy.requiresAuth && !isAuthenticated) return false;

      // Vérification niveau RBAC
      if (userRbacLevel > policy.minRbacLevel) return false;

      // Vérification permissions spécifiques
      if (policy.requiredPermissions && policy.requiredPermissions.length > 0) {
        const hasAll = policy.requiredPermissions.every((perm) =>
          userPermissions.includes(perm),
        );
        if (!hasAll) return false;
      }

      return true;
    };
  }, [userRbacLevel, isAuthenticated, userPermissions]);

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
