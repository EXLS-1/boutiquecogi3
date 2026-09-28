// lib/product/product-policy.ts

import type { ProductActor } from "@/lib/product/product-types";
import { getProductTypeConfig } from "@/lib/product-type/product-type.repository";
import type { ProductTypeConfig } from "@prisma/client";

export interface ProductDecision {
  allowed: boolean;
  reasons: string[];
  config: ProductTypeConfig;
}

async function decide(
  actor: ProductActor,
  type: string | undefined | null,
  operation: "create" | "edit" | "delete"
): Promise<ProductDecision> {
  const config = await getProductTypeConfig(type);
  const reasons: string[] = [];

  const requiredPermission =
    operation === "create"
      ? config.requiredPermissionCreate
      : operation === "edit"
      ? config.requiredPermissionEdit
      : config.requiredPermissionDelete;

  if (!actor.permissions.has(requiredPermission as any)) {
    reasons.push(`Permission manquante : ${requiredPermission}`);
  }

  const minLevel =
    operation === "create"
      ? config.minRoleLevelCreate
      : operation === "edit"
      ? config.minRoleLevelEdit
      : config.minRoleLevelDelete;

  if (actor.roleLevel < minLevel) {
    reasons.push(`Niveau de rôle insuffisant : ${actor.roleLevel} < ${minLevel}`);
  }

  const whoCan =
    operation === "create"
      ? config.whoCanCreate
      : operation === "edit"
      ? config.whoCanEdit
      : config.whoCanDelete;

  if (!whoCan.includes(actor.role)) {
    reasons.push(`Rôle non autorisé pour l'opération '${operation}' : ${actor.role}`);
  }

  return { allowed: reasons.length === 0, reasons, config };
}

export const canCreateProduct = (actor: ProductActor, type?: string | null) => decide(actor, type, "create");
export const canEditProduct = (actor: ProductActor, type?: string | null) => decide(actor, type, "edit");
export const canDeleteProduct = (actor: ProductActor, type?: string | null) => decide(actor, type, "delete");
