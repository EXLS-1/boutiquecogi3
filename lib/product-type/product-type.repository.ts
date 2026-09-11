// lib/product-type/product-type.repository.ts
// =============================================================================
// PRODUCT TYPE — Accès DB aux ProductTypeConfig (cacheable)
// =============================================================================
// ProductTypeConfig.type est la clé de policy produit :
//   whoCanCreate / whoCanEdit / whoCanDelete
//   requiredPermission* / minRoleLevel* / maxVariants / requiresApproval
//
// Toute création / édition / suppression de produit DOIT passer par la
// policy résolue depuis cette table (jamais de constante codée en dur).

import { prisma } from "@/lib/prisma";
import type { ProductTypeConfig } from "@prisma/client";

/** Fallback rétrocompatibilité si la table est vide ou type inconnu. */
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
};

export async function getProductTypeConfig(
  type: string | null | undefined
): Promise<ProductTypeConfig> {
  const key = type ?? DEFAULT_PRODUCT_TYPE_CONFIG.type;

  const config = await prisma.productTypeConfig.findUnique({
    where: { type: key },
  });

  if (config) return config;

  // Type inconnu → fallback, mais on remonte la config du type par défaut
  const fallback = await prisma.productTypeConfig.findUnique({
    where: { type: DEFAULT_PRODUCT_TYPE_CONFIG.type },
  });

  return fallback ?? { id: "default", ...DEFAULT_PRODUCT_TYPE_CONFIG };
}

/** Liste tous les types actifs (pour les selects du wizard produit). */
export async function listProductTypeConfigs(): Promise<ProductTypeConfig[]> {
  return prisma.productTypeConfig.findMany({
    orderBy: { type: "asc" },
  });
}
