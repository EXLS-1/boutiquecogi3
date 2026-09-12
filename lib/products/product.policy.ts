// lib/products/product.policy.ts
// =============================================================================
// PRODUCT POLICY — RBAC niveau produit (3 niveaux)
// =============================================================================
// Couche 3 du pipeline RBAC :
//   1. Permission globale (lib/auth/rbac : hasPermissionOnResult)
//   2. ProductTypeConfig (whoCan* / minRoleLevel* / requiredPermission*)
//   3. Ownership (createdBy) pour certaines opérations
//
// Décision binaire + raisons d'échec (audit/UX).
//

import { PERMISSIONS, type PermissionCode, type Role } from "@/lib/auth/rbac";
import { getProductTypeConfig } from "@/lib/product-type/product-type.repository";
import type { ProductTypeConfig } from "@prisma/client";

export interface ProductActor {
  userId: string;
  role: Role;
  roleLevel: number;
  permissions: Set<PermissionCode>;
}

export interface ProductDecision {
  allowed: boolean;
  reasons: string[];
  config: ProductTypeConfig;
}

function _decide(
  actor: ProductActor,
  config: ProductTypeConfig,
  operation: "create" | "edit" | "delete" | "publish" | "unpublish" | "archive" | "restore"
): ProductDecision {
  const reasons: string[] = [];

  // 1. Permission globale
  const permMap: Record<typeof operation, PermissionCode> = {
    create: config.requiredPermissionCreate,
    edit: config.requiredPermissionEdit,
    delete: config.requiredPermissionDelete,
    publish: config.requiredPermissionEdit,
    unpublish: config.requiredPermissionEdit,
    archive: config.requiredPermissionEdit,
    restore: config.requiredPermissionEdit,
  };
  const requiredPermission = permMap[operation];
  if (!actor.permissions.has(requiredPermission)) {
    reasons.push(`Permission requise manquante : ${requiredPermission}`);
  }

  // 2. Niveau hiérarchique
  const minLevelMap: Record<typeof operation, number> = {
    create: config.minRoleLevelCreate,
    edit: config.minRoleLevelEdit,
    delete: config.minRoleLevelDelete,
    publish: config.minRoleLevelEdit,
    unpublish: config.minRoleLevelEdit,
    archive: config.minRoleLevelEdit,
    restore: config.minRoleLevelEdit,
  };
  const minLevel = minLevelMap[operation];
  if (actor.roleLevel < minLevel) {
    reasons.push(`Niveau de rôle insuffisant : ${actor.roleLevel} < ${minLevel}`);
  }

  // 3. Rôle explicite (whoCan*) — liste blanche
  const whoCanMap: Record<typeof operation, string[]> = {
    create: config.whoCanCreate,
    edit: config.whoCanEdit,
    delete: config.whoCanDelete,
    publish: config.whoCanEdit,
    unpublish: config.whoCanEdit,
    archive: config.whoCanEdit,
    restore: config.whoCanEdit,
  };
  const whoCan = whoCanMap[operation];
  if (!whoCan.includes(actor.role)) {
    reasons.push(`Rôle non autorisé pour ${operation} : ${actor.role}`);
  }

  return { allowed: reasons.length === 0, reasons, config };
}

export async function canCreateProduct(actor: ProductActor, type?: string | null): Promise<ProductDecision> {
  const config = await getProductTypeConfig(type);
  return _decide(actor, config, "create");
}

export async function canEditProduct(actor: ProductActor, type?: string | null): Promise<ProductDecision> {
  const config = await getProductTypeConfig(type);
  return _decide(actor, config, "edit");
}

export async function canDeleteProduct(actor: ProductActor, type?: string | null): Promise<ProductDecision> {
  const config = await getProductTypeConfig(type);
  return _decide(actor, config, "delete");
}

export async function canPublishProduct(actor: ProductActor, type?: string | null): Promise<ProductDecision> {
  const config = await getProductTypeConfig(type);
  return _decide(actor, config, "publish");
}

export async function canArchiveProduct(actor: ProductActor, type?: string | null): Promise<ProductDecision> {
  const config = await getProductTypeConfig(type);
  return _decide(actor, config, "archive");
}
