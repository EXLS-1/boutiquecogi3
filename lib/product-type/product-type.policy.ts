// lib/product-type/product-type.policy.ts
// =============================================================================
// PRODUCT TYPE — Policy d'autorisation par type de produit
// =============================================================================
// Résout la triple vérification RBAC × ProductTypeConfig :
//   1. Permission globale (lib/auth/rbac : hasPermission)
//   2. Niveau hiérarchique (minRoleLevel* de la config)
//   3. Rôle explicite (whoCan* de la config)
//
// Le résultat est une décision binaire + les raisons d'échec (audit/UX).

import { PERMISSIONS, type Role, type PermissionCode } from "@/lib/auth/rbac";
import { getProductTypeConfig } from "./product-type.repository";
import type { ProductTypeConfig } from "@prisma/client";

export interface ProductTypeActor {
  userId: string;
  role: Role;
  roleLevel: number;
  permissions: Set<PermissionCode>;
}

export interface ProductTypeDecision {
  allowed: boolean;
  reasons: string[];
  config: ProductTypeConfig;
}

function decide(
  actor: ProductTypeActor,
  config: ProductTypeConfig,
  operation: "create" | "edit" | "delete"
): ProductTypeDecision {
  const reasons: string[] = [];

  const whoCan: string[] =
    operation === "create"
      ? config.whoCanCreate
      : operation === "edit"
        ? config.whoCanEdit
        : config.whoCanDelete;

  const requiredPermission: PermissionCode =
    (operation === "create"
      ? config.requiredPermissionCreate
      : operation === "edit"
        ? config.requiredPermissionEdit
        : config.requiredPermissionDelete) as PermissionCode;

  const minRoleLevel =
    operation === "create"
      ? config.minRoleLevelCreate
      : operation === "edit"
        ? config.minRoleLevelEdit
        : config.minRoleLevelDelete;

  // 1. Permission globale
  const hasPermission = actor.permissions.has(requiredPermission);
  if (!hasPermission) {
    reasons.push(`Permission requise manquante : ${requiredPermission}`);
  }

  // 2. Niveau hiérarchique (minRoleLevel : plus élevé = plus de droits)
  if (actor.roleLevel < minRoleLevel) {
    reasons.push(
      `Niveau de rôle insuffisant : ${actor.roleLevel} < ${minRoleLevel}`
    );
  }

  // 3. Rôle explicite (whoCan* : liste blanche de rôles)
  const roleAllowed = whoCan.includes(actor.role);
  if (!roleAllowed) {
    reasons.push(`Rôle non autorisé pour cette opération : ${actor.role}`);
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    config,
  };
}

export async function canCreateProductType(
  actor: ProductTypeActor,
  productType: string | null | undefined
): Promise<ProductTypeDecision> {
  const config = await getProductTypeConfig(productType);
  return decide(actor, config, "create");
}

export async function canEditProductType(
  actor: ProductTypeActor,
  productType: string | null | undefined
): Promise<ProductTypeDecision> {
  const config = await getProductTypeConfig(productType);
  return decide(actor, config, "edit");
}

export async function canDeleteProductType(
  actor: ProductTypeActor,
  productType: string | null | undefined
): Promise<ProductTypeDecision> {
  const config = await getProductTypeConfig(productType);
  return decide(actor, config, "delete");
}

/** Vérifie la limite de variantes du type (VariantStock × maxVariants). */
export function checkVariantLimit(
  decision: ProductTypeDecision,
  variantCount: number
): { ok: boolean; reason: string | null } {
  if (variantCount > decision.config.maxVariants) {
    return {
      ok: false,
      reason: `Limite de variantes dépassée : ${variantCount} > ${decision.config.maxVariants}`,
    };
  }
  return { ok: true, reason: null };
}
