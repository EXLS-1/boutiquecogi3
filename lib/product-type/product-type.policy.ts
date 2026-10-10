// lib/product-type/product-type.policy.ts
// =============================================================================
// PRODUCT TYPE — Policy d'autorisation par type de produit
// =============================================================================
// Résout la triple vérification RBAC × ProductTypeConfig :
//   1. État actif du type de produit (config.isActive)
//   2. Permission globale (actor.permissions)
//   3. Niveau hiérarchique (minRoleLevel)
//   4. Rôle explicite (whoCan)
//
// Le résultat est une décision binaire + motifs explicites d'échec (audit/UX).

import type { PermissionCode } from "@/lib/auth/rbac";
import { getProductTypeConfig } from "./product-type.repository";
import type {
  ProductTypeActor,
  ProductTypeDecision,
  ProductTypeOperation,
  VariantLimitCheckResult,
} from "@/lib/product/product-types";

// Re-export des types pour préserver la rétrocompatibilité des imports
export type { ProductTypeActor, ProductTypeDecision, VariantLimitCheckResult };

/**
 * Mappage des propriétés de configuration selon l'opération demandée.
 */
function getOperationRules(
  config: import("@prisma/client").ProductTypeConfig,
  operation: ProductTypeOperation
) {
  const map = {
    create: {
      whoCan: config.whoCanCreate,
      requiredPermission: config.requiredPermissionCreate,
      minRoleLevel: config.minRoleLevelCreate,
    },
    edit: {
      whoCan: config.whoCanEdit,
      requiredPermission: config.requiredPermissionEdit,
      minRoleLevel: config.minRoleLevelEdit,
    },
    delete: {
      whoCan: config.whoCanDelete,
      requiredPermission: config.requiredPermissionDelete,
      minRoleLevel: config.minRoleLevelDelete,
    },
  } as const;

  return map[operation];
}

/**
 * Moteur de décision binaire pour les politiques associées aux types de produits.
 */
function decide(
  actor: ProductTypeActor,
  config: import("@prisma/client").ProductTypeConfig,
  operation: ProductTypeOperation
): ProductTypeDecision {
  const reasons: string[] = [];

  // 0. Vérification de l'activation du type de produit
  if (!config.isActive) {
    reasons.push(`Le type de produit "${config.type}" est désactivé.`);
  }

  const rules = getOperationRules(config, operation);
  const requiredPermission = rules.requiredPermission as PermissionCode;

  // 1. Permission globale RBAC
  const hasPermission =
    !!actor.permissions && actor.permissions.has(requiredPermission);
  if (!hasPermission) {
    reasons.push(
      `Permission requise manquante : ${requiredPermission ?? "NON_DEFINIE"}`
    );
  }

  // 2. Niveau hiérarchique (minRoleLevel : plus élevé = plus de privilèges)
  const minRoleLevel = Number(rules.minRoleLevel ?? 0);
  if (actor.roleLevel < minRoleLevel) {
    reasons.push(
      `Niveau de rôle insuffisant pour l'opération ${operation} : ${actor.roleLevel} < ${minRoleLevel}`
    );
  }

  // 3. Rôle explicite (whoCan* : liste blanche des rôles autorisés)
  const whoCan: unknown = rules.whoCan;
  const roleAllowed =
    (Array.isArray(whoCan) && (whoCan as readonly unknown[]).includes(actor.role)) ||
    (typeof whoCan === "string" &&
      whoCan
        .split(",")
        .map((r) => r.trim())
        .includes(String(actor.role)));
  if (!roleAllowed) {
    reasons.push(
      `Rôle "${actor.role}" non autorisé pour l'opération ${operation} sur le type "${config.type}"`
    );
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    config,
  };
}

// ───────────────────────────────────────────
// CLIENT POLICY METHODS
// ───────────────────────────────────────────

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

/**
 * Vérifie si le nombre de variantes dépasse le plafond défini pour ce type de produit.
 */
export function checkVariantLimit(
  decision: ProductTypeDecision,
  variantCount: number
): VariantLimitCheckResult {
  const count = Math.max(0, variantCount);
  const max = decision.config.maxVariants;

  if (count > max) {
    return {
      ok: false,
      reason: `Limite de variantes dépassée pour le type "${decision.config.type}" : ${count} > ${max}`,
    };
  }

  return { ok: true, reason: null };
}
