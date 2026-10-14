// lib/audit/audit.helpers.ts
// ============================================
// HELPERS SPÉCIALISÉS POUR L'AUDIT
// ============================================

import { logAudit } from "./audit.service";
import { AUDIT_ACTIONS, AUDIT_ENTITIES, AUDIT_SEVERITY } from "./types";
import type { Role } from "@/lib/auth/rbac";

// ───────────────────────────────────────────
// AUTHENTIFICATION
// ───────────────────────────────────────────

export async function auditLogin(
  userId: string,
  success: boolean,
  metadata?: Record<string, unknown>
) {
  await logAudit({
    userId,
    action: success ? AUDIT_ACTIONS.AUTH_LOGIN : AUDIT_ACTIONS.AUTH_FAILED,
    entity: AUDIT_ENTITIES.USER,
    entityId: userId,
    success,
    severity: success ? AUDIT_SEVERITY.INFO : AUDIT_SEVERITY.WARNING,
    metadata,
  });
}

export async function auditLogout(userId: string) {
  await logAudit({
    userId,
    action: AUDIT_ACTIONS.AUTH_LOGOUT,
    entity: AUDIT_ENTITIES.USER,
    entityId: userId,
    success: true,
  });
}

// ───────────────────────────────────────────
// UTILISATEURS
// ───────────────────────────────────────────

export async function auditUserAction(
  action: "created" | "updated" | "deleted" | "blocked" | "unblocked",
  targetUserId: string,
  actorUserId: string,
  changes?: { oldValue?: unknown; newValue?: unknown }
) {
  const actionMap = {
    created: AUDIT_ACTIONS.USER_CREATED,
    updated: AUDIT_ACTIONS.USER_UPDATED,
    deleted: AUDIT_ACTIONS.USER_DELETED,
    blocked: AUDIT_ACTIONS.USER_BLOCKED,
    unblocked: AUDIT_ACTIONS.USER_UNBLOCKED,
  };
  
  await logAudit({
    userId: actorUserId,
    action: actionMap[action],
    entity: AUDIT_ENTITIES.USER,
    entityId: targetUserId,
    oldValue: changes?.oldValue,
    newValue: changes?.newValue,
    success: true,
    severity: action === "deleted" ? AUDIT_SEVERITY.WARNING : AUDIT_SEVERITY.INFO,
  });
}

export async function auditRoleChange(
  targetUserId: string,
  actorUserId: string,
  oldRole: Role,
  newRole: Role
) {
  await logAudit({
    userId: actorUserId,
    action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
    entity: AUDIT_ENTITIES.USER,
    entityId: targetUserId,
    oldValue: { role: oldRole },
    newValue: { role: newRole },
    success: true,
    severity: AUDIT_SEVERITY.WARNING,
    details: `Rôle changé de ${oldRole} à ${newRole}`,
  });
}

// ───────────────────────────────────────────
// PRODUITS
// ───────────────────────────────────────────

export async function auditProductAction(
  action: "created" | "updated" | "deleted" | "published" | "archived",
  productId: string,
  userId: string,
  changes?: { oldValue?: unknown; newValue?: unknown }
) {
  const actionMap = {
    created: AUDIT_ACTIONS.PRODUCT_CREATED,
    updated: AUDIT_ACTIONS.PRODUCT_UPDATED,
    deleted: AUDIT_ACTIONS.PRODUCT_DELETED,
    published: AUDIT_ACTIONS.PRODUCT_PUBLISHED,
    archived: AUDIT_ACTIONS.PRODUCT_ARCHIVED,
  };
  
  await logAudit({
    userId,
    action: actionMap[action],
    entity: AUDIT_ENTITIES.PRODUCT,
    entityId: productId,
    oldValue: changes?.oldValue,
    newValue: changes?.newValue,
    success: true,
    severity: action === "deleted" ? AUDIT_SEVERITY.WARNING : AUDIT_SEVERITY.INFO,
  });
}

// ───────────────────────────────────────────
// COMMANDES
// ───────────────────────────────────────────

export async function auditOrderAction(
  action: "created" | "updated" | "cancelled" | "status_changed" | "refunded",
  orderId: string,
  userId: string,
  changes?: { oldValue?: unknown; newValue?: unknown }
) {
  const actionMap = {
    created: AUDIT_ACTIONS.ORDER_CREATED,
    updated: AUDIT_ACTIONS.ORDER_UPDATED,
    cancelled: AUDIT_ACTIONS.ORDER_CANCELLED,
    status_changed: AUDIT_ACTIONS.ORDER_STATUS_CHANGED,
    refunded: AUDIT_ACTIONS.ORDER_REFUNDED,
  };
  
  await logAudit({
    userId,
    action: actionMap[action],
    entity: AUDIT_ENTITIES.ORDER,
    entityId: orderId,
    oldValue: changes?.oldValue,
    newValue: changes?.newValue,
    success: true,
    severity: action === "cancelled" || action === "refunded" ? AUDIT_SEVERITY.WARNING : AUDIT_SEVERITY.INFO,
  });
}

// ───────────────────────────────────────────
// PAIEMENTS
// ───────────────────────────────────────────

export async function auditPaymentAction(
  action: "initiated" | "completed" | "failed" | "refunded",
  paymentId: string,
  orderId: string,
  userId: string,
  metadata?: Record<string, unknown>
) {
  const actionMap = {
    initiated: AUDIT_ACTIONS.PAYMENT_INITIATED,
    completed: AUDIT_ACTIONS.PAYMENT_COMPLETED,
    failed: AUDIT_ACTIONS.PAYMENT_FAILED,
    refunded: AUDIT_ACTIONS.PAYMENT_REFUNDED,
  };
  
  await logAudit({
    userId,
    action: actionMap[action],
    entity: AUDIT_ENTITIES.PAYMENT,
    entityId: paymentId,
    metadata: { ...metadata, orderId },
    success: action !== "failed",
    severity: action === "failed" ? AUDIT_SEVERITY.ERROR : AUDIT_SEVERITY.INFO,
  });
}

// ───────────────────────────────────────────
// STOCK
// ───────────────────────────────────────────

export async function auditStockAction(
  action: "updated" | "reserved" | "released" | "adjusted",
  productId: string,
  userId: string,
  changes: { oldValue: number; newValue: number; reason?: string }
) {
  const actionMap = {
    updated: AUDIT_ACTIONS.STOCK_UPDATED,
    reserved: AUDIT_ACTIONS.STOCK_RESERVED,
    released: AUDIT_ACTIONS.STOCK_RELEASED,
    adjusted: AUDIT_ACTIONS.STOCK_ADJUSTED,
  };
  
  await logAudit({
    userId,
    action: actionMap[action],
    entity: AUDIT_ENTITIES.STOCK,
    entityId: productId,
    oldValue: { quantity: changes.oldValue },
    newValue: { quantity: changes.newValue },
    metadata: { reason: changes.reason },
    success: true,
    severity: AUDIT_SEVERITY.INFO,
  });
}
