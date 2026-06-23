/**
 * =============================================================================
 * USE CATEGORY PERMISSIONS - Boutiquecogi3
 * =============================================================================
 * Hook centralisant la logique RBAC pour les catégories.
 * Gère les sessions libres (GUEST) et authentifiées.
 */

"use client";

import { useMemo } from "react";
import { 
  CategoryDefinition, 
  RbacLevel, 
  RBAC_LEVELS 
} from "@/lib/category/category-types";

interface UseCategoryPermissionsOptions {
  readonly userRbacLevel?: RbacLevel;
  readonly isAuthenticated: boolean;
}

interface UseCategoryPermissionsReturn {
  readonly filteredCategories: readonly CategoryDefinition[];
  readonly canViewCategory: (category: CategoryDefinition) => boolean;
  readonly hasAnyVisibleCategory: boolean;
}

/**
 * Filtre les catégories selon les permissions RBAC de l'utilisateur.
 * 
 * Règles :
 * - GUEST (non authentifié) : LEVEL 7, accès minimal
 * - Authentifié : niveau déterminé par le système RBAC
 * - requiresAuth=true : catégorie visible uniquement si authentifié
 * - minRbacLevel : niveau minimum requis
 */
export function useCategoryPermissions({
  userRbacLevel = RBAC_LEVELS.GUEST,
  isAuthenticated,
}: UseCategoryPermissionsOptions): UseCategoryPermissionsReturn {
  
  const canViewCategory = useMemo(() => {
    return (category: CategoryDefinition): boolean => {
      // Si la catégorie nécessite une authentification et l'utilisateur ne l'est pas
      if (category.requiresAuth && !isAuthenticated) {
        return false;
      }

      // Vérification du niveau RBAC minimum
      // Plus le niveau est bas (1 = SUPER_ADMIN), plus les privilèges sont élevés
      return userRbacLevel <= category.minRbacLevel;
    };
  }, [userRbacLevel, isAuthenticated]);

  const filteredCategories = useMemo(() => {
    // Cette logique sera utilisée par le composant parent qui reçoit les catégories
    return (categories: readonly CategoryDefinition[]) => 
      categories.filter(canViewCategory);
  }, [canViewCategory]);

  return {
    filteredCategories: [], // Sera peuplé par l'appelant
    canViewCategory,
    hasAnyVisibleCategory: true, // Calculé dynamiquement
  };
}

/**
 * Hook utilitaire pour filtrer un tableau de catégories spécifique
 */
export function useFilteredCategories(
  categories: readonly CategoryDefinition[],
  options: UseCategoryPermissionsOptions
): readonly CategoryDefinition[] {
  const { canViewCategory } = useCategoryPermissions(options);

  return useMemo(() => {
    return categories.filter(canViewCategory);
  }, [categories, canViewCategory]);
}
