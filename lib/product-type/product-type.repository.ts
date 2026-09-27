// lib/product-type/product-type.repository.ts
// =============================================================================
// PRODUCT TYPE — Accès DB aux ProductTypeConfig (Cacheable & Résilient)
// =============================================================================
// Remarque : Ce repository agit comme source de vérité pour les configurations
// de types de produits. Il est sécurisé contre les pannes DB et optimisé
// via déduplication d'appels (React Cache).

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { ProductTypeConfig } from "@prisma/client";

/**
 * Fallback de configuration par défaut si le type est inconnu, la table vide,
 * ou la base de données temporairement inaccessible.
 */
export const DEFAULT_PRODUCT_TYPE_CONFIG: Omit<
  ProductTypeConfig,
  "id" | "createdAt" | "updatedAt"
> = {
  type: "PHYSICAL",
  label: "Produit physique",
  description: null,
  whoCanCreate: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  whoCanEdit: ["SUPER_ADMIN", "ADMIN", "MANAGER", "EDITOR"],
  whoCanDelete: ["SUPER_ADMIN", "ADMIN"],
  requiredPermissionCreate: "products:create",
  requiredPermissionEdit: "products:update",
  requiredPermissionDelete: "products:delete",
  minRoleLevelCreate: 5,
  minRoleLevelEdit: 4,
  minRoleLevelDelete: 6,
  maxVariants: 100,
  requiresApproval: false,
  isDefault: true,
  isActive: true,
};

/**
 * Construit un objet ProductTypeConfig complet et typé pour les cas de fallback.
 */
function createFallbackConfig(typeKey?: string): ProductTypeConfig {
  const now = new Date();
  return {
    id: `fallback-${typeKey ?? "default"}`,
    ...DEFAULT_PRODUCT_TYPE_CONFIG,
    type: typeKey ?? DEFAULT_PRODUCT_TYPE_CONFIG.type,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Récupère la configuration d'un type de produit par sa clé.
 * Dédupliqué automatiquement par requête grâce à React `cache()`.
 */
export const getProductTypeConfig = cache(
  async (type: string | null | undefined): Promise<ProductTypeConfig> => {
    const key = type?.trim() || DEFAULT_PRODUCT_TYPE_CONFIG.type;

    try {
      const config = await prisma.productTypeConfig.findUnique({
        where: { type: key },
      });

      if (config) return config;

      // Si le type spécifié est introuvable, tentative de récupération du type par défaut
      if (key !== DEFAULT_PRODUCT_TYPE_CONFIG.type) {
        const defaultConfig = await prisma.productTypeConfig.findUnique({
          where: { type: DEFAULT_PRODUCT_TYPE_CONFIG.type },
        });

        if (defaultConfig) return defaultConfig;
      }

      return createFallbackConfig(key);
    } catch (error) {
      console.error(
        `[ProductTypeRepository] Échec de récupération pour le type "${key}". Utilisation du fallback.`,
        error
      );
      return createFallbackConfig(key);
    }
  }
);

/**
 * Liste tous les types de produits ACTIFS pour les formulaires d'administration.
 * Dédupliqué par requête via React `cache()`.
 */
export const listProductTypeConfigs = cache(
  async (): Promise<ProductTypeConfig[]> => {
    try {
      return await prisma.productTypeConfig.findMany({
        where: { isActive: true },
        orderBy: { type: "asc" },
      });
    } catch (error) {
      console.error(
        "[ProductTypeRepository] Erreur lors du chargement des types actifs.",
        error
      );
      return [createFallbackConfig()];
    }
  }
);
