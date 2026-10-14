// lib/audit/types.ts
// ============================================
// TYPES DU SYSTÈME D'AUDIT
// ============================================

import type { Role } from "@/lib/auth/rbac";

// ───────────────────────────────────────────
// ACTIONS D'AUDIT
// ───────────────────────────────────────────
export const AUDIT_ACTIONS = {
  // Authentification
  AUTH_LOGIN: "AUTH_LOGIN",
  AUTH_LOGOUT: "AUTH_LOGOUT",
  AUTH_FAILED: "AUTH_FAILED",
  AUTH_PASSWORD_RESET: "AUTH_PASSWORD_RESET",
  AUTH_2FA_ENABLED: "AUTH_2FA_ENABLED",
  AUTH_2FA_DISABLED: "AUTH_2FA_DISABLED",
  
  // Utilisateurs
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_DELETED: "USER_DELETED",
  USER_BLOCKED: "USER_BLOCKED",
  USER_UNBLOCKED: "USER_UNBLOCKED",
  USER_ROLE_CHANGED: "USER_ROLE_CHANGED",
  
  // Produits
  PRODUCT_CREATED: "PRODUCT_CREATED",
  PRODUCT_UPDATED: "PRODUCT_UPDATED",
  PRODUCT_DELETED: "PRODUCT_DELETED",
  PRODUCT_PUBLISHED: "PRODUCT_PUBLISHED",
  PRODUCT_ARCHIVED: "PRODUCT_ARCHIVED",
  PRODUCT_STATUS_CHANGED: "PRODUCT_STATUS_CHANGED",
  
  // Commandes
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_UPDATED: "ORDER_UPDATED",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  ORDER_STATUS_CHANGED: "ORDER_STATUS_CHANGED",
  ORDER_REFUNDED: "ORDER_REFUNDED",
  
  // Paiements
  PAYMENT_INITIATED: "PAYMENT_INITIATED",
  PAYMENT_COMPLETED: "PAYMENT_COMPLETED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  PAYMENT_REFUNDED: "PAYMENT_REFUNDED",
  PAYMENT_WEBHOOK_RECEIVED: "PAYMENT_WEBHOOK_RECEIVED",
  
  // Stock
  STOCK_UPDATED: "STOCK_UPDATED",
  STOCK_RESERVED: "STOCK_RESERVED",
  STOCK_RELEASED: "STOCK_RELEASED",
  STOCK_ADJUSTED: "STOCK_ADJUSTED",
  
  // Audit
  AUDIT_APPROVAL_REQUESTED: "AUDIT_APPROVAL_REQUESTED",
  AUDIT_APPROVAL_GRANTED: "AUDIT_APPROVAL_GRANTED",
  AUDIT_APPROVAL_REJECTED: "AUDIT_APPROVAL_REJECTED",
  AUDIT_APPROVAL_REVOKED: "AUDIT_APPROVAL_REVOKED",
  
  // Système
  SYSTEM_CONFIG_UPDATED: "SYSTEM_CONFIG_UPDATED",
  PERMISSION_CHANGED: "PERMISSION_CHANGED",
  ROLE_CREATED: "ROLE_CREATED",
  ROLE_UPDATED: "ROLE_UPDATED",
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];

// ───────────────────────────────────────────
// ENTITÉS
// ───────────────────────────────────────────
export const AUDIT_ENTITIES = {
  USER: "USER",
  PRODUCT: "PRODUCT",
  ORDER: "ORDER",
  PAYMENT: "PAYMENT",
  STOCK: "STOCK",
  CATEGORY: "CATEGORY",
  COUPON: "COUPON",
  REVIEW: "REVIEW",
  ROLE: "ROLE",
  PERMISSION: "PERMISSION",
  AUDIT_APPROVAL: "AUDIT_APPROVAL",
  SYSTEM: "SYSTEM",
} as const;

export type AuditEntity = typeof AUDIT_ENTITIES[keyof typeof AUDIT_ENTITIES];

// ───────────────────────────────────────────
// NIVEAUX DE SÉVÉRITÉ
// ───────────────────────────────────────────
export const AUDIT_SEVERITY = {
  INFO: "INFO",
  WARNING: "WARNING",
  ERROR: "ERROR",
  CRITICAL: "CRITICAL",
} as const;

export type AuditSeverity = typeof AUDIT_SEVERITY[keyof typeof AUDIT_SEVERITY];

// ───────────────────────────────────────────
// INTERFACES
// ───────────────────────────────────────────
export interface AuditLogData {
  userId?: string;
  role?: Role;
  action: AuditAction | string;
  entity?: AuditEntity | string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  severity?: AuditSeverity;
  success?: boolean;
  error?: string;
  ipAddress?: string;
  userAgent?: string;
  duration?: number;
  details?: string;
}

export interface AuditLogFilter {
  userId?: string;
  action?: AuditAction | string;
  entity?: AuditEntity | string;
  entityId?: string;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface AuditLogQuery {
  filter?: AuditLogFilter;
  page?: number;
  limit?: number;
  orderBy?: "createdAt" | "severity";
  orderDirection?: "asc" | "desc";
}

export interface AuditLogStats {
  total: number;
  byAction: Record<string, number>;
  byEntity: Record<string, number>;
  bySeverity: Record<string, number>;
  byDay: Array<{ date: string; count: number }>;
}
