// lib/product-audit/product-audit.service.ts
// =============================================================================
// AUDIT PRODUIT — Écriture centralisée dans AuditLog
// =============================================================================
// Utilisable :
//   - à l'intérieur d'une transaction Prisma (passer `tx`)
//   - de façon autonome (crée sa propre écriture via `prisma`)
//
// Fire-and-forget volontairement interdit : l'audit fait partie de la
// transaction métier (cohérence Product ↔ AuditLog garantie).

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Tx } from "./product-audit.types";
import type { ProductAuditAction } from "./product-audit.constants";

export interface ProductAuditInput {
  action: ProductAuditAction;
  /** Auteur de l'opération. */
  userId?: string | null;
  roleLevel?: number;
  productId: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  details?: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string | null;
}

export async function recordProductAudit(
  input: ProductAuditInput,
  tx?: Tx
): Promise<void> {
  const client = tx ?? prisma;
  await client.auditLog.create({
    data: {
      userId: input.userId ?? undefined,
      roleLevel: input.roleLevel ?? 0,
      action: input.action,
      targetId: input.productId,
      targetType: "PRODUCT",
      entity: "PRODUCT",
      entityType: "PRODUCT",
      entityId: input.productId,
      oldValue: input.oldValue ?? Prisma.JsonNull,
      newValue: input.newValue ?? Prisma.JsonNull,
      metadata: input.metadata ?? Prisma.JsonNull,
      details: input.details,
      status: "SUCCESS",
      ip: input.ip,
      ipAddress: input.ip,
      userAgent: input.userAgent,
      sessionId: input.sessionId ?? undefined,
    },
  });
}
