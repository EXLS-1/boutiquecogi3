// ============================================================
// 9. useAuditRBAC - Événement audit
// ============================================================
// hooks/rbac/use-audit-rbac.ts
"use client";

import { useMemo } from "react";
import { useRBAC } from "./use-rbac";

export type AuditEvent =
  | "user_login"
  | "user_logout"
  | "password_change"
  | "permission_change"
  | "data_export"
  | "data_import"
  | "settings_change"
  | "payment_processed"
  | "refund_issued"
  | "product_deleted"
  | "bulk_operation";

export type AuditAction = "view" | "export" | "delete" | "configure" | "alert";

interface AuditMetadata {
  severity: "low" | "medium" | "high" | "critical";
  retentionDays: number;
  isImmutable: boolean;
  allowedActions: AuditAction[];
  minRoleLevel: number;
  requiresJustification: boolean;
  realTimeAlert: boolean;
}

interface UseAuditRBACReturn {
  allowed: boolean;
  metadata: AuditMetadata;
  canPerform: (action: AuditAction) => boolean;
  canViewSeverity: (severity: AuditMetadata["severity"]) => boolean;
  isLogImmutable: boolean;
}

const AUDIT_EVENT_CONFIG: Record<AuditEvent, AuditMetadata> = {
  user_login: {
    severity: "low",
    retentionDays: 90,
    isImmutable: true,
    allowedActions: ["view", "export"],
    minRoleLevel: 3,
    requiresJustification: false,
    realTimeAlert: false,
  },
  user_logout: {
    severity: "low",
    retentionDays: 90,
    isImmutable: true,
    allowedActions: ["view", "export"],
    minRoleLevel: 3,
    requiresJustification: false,
    realTimeAlert: false,
  },
  password_change: {
    severity: "medium",
    retentionDays: 365,
    isImmutable: true,
    allowedActions: ["view", "export", "alert"],
    minRoleLevel: 4,
    requiresJustification: false,
    realTimeAlert: true,
  },
  permission_change: {
    severity: "high",
    retentionDays: 730,
    isImmutable: true,
    allowedActions: ["view", "export", "alert"],
    minRoleLevel: 5,
    requiresJustification: true,
    realTimeAlert: true,
  },
  data_export: {
    severity: "high",
    retentionDays: 730,
    isImmutable: true,
    allowedActions: ["view", "export", "alert"],
    minRoleLevel: 5,
    requiresJustification: true,
    realTimeAlert: true,
  },
  data_import: {
    severity: "medium",
    retentionDays: 365,
    isImmutable: true,
    allowedActions: ["view", "export"],
    minRoleLevel: 4,
    requiresJustification: true,
    realTimeAlert: false,
  },
  settings_change: {
    severity: "high",
    retentionDays: 730,
    isImmutable: true,
    allowedActions: ["view", "export", "alert"],
    minRoleLevel: 5,
    requiresJustification: true,
    realTimeAlert: true,
  },
  payment_processed: {
    severity: "medium",
    retentionDays: 2555, // 7 ans (obligation légale)
    isImmutable: true,
    allowedActions: ["view", "export"],
    minRoleLevel: 4,
    requiresJustification: false,
    realTimeAlert: false,
  },
  refund_issued: {
    severity: "high",
    retentionDays: 2555,
    isImmutable: true,
    allowedActions: ["view", "export", "alert"],
    minRoleLevel: 5,
    requiresJustification: true,
    realTimeAlert: true,
  },
  product_deleted: {
    severity: "medium",
    retentionDays: 365,
    isImmutable: true,
    allowedActions: ["view", "export"],
    minRoleLevel: 4,
    requiresJustification: false,
    realTimeAlert: false,
  },
  bulk_operation: {
    severity: "critical",
    retentionDays: 1095, // 3 ans
    isImmutable: true,
    allowedActions: ["view", "export", "alert", "configure"],
    minRoleLevel: 6,
    requiresJustification: true,
    realTimeAlert: true,
  },
};

const SEVERITY_LEVELS: Record<AuditMetadata["severity"], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function useAuditRBAC(
  event: AuditEvent,
  action: AuditAction,
): UseAuditRBACReturn {
  const { level, hasPermission } = useRBAC();

  const config = useMemo(() => AUDIT_EVENT_CONFIG[event], [event]);

  const allowed = useMemo(() => {
    if (!level) return false;
    const meetsLevel = level >= config.minRoleLevel;
    const hasAuditPermission =
      hasPermission("analytics:read") ||
      hasPermission("settings:system_config");
    const actionAllowed = config.allowedActions.includes(action);
    return meetsLevel && hasAuditPermission && actionAllowed;
  }, [level, config, action, hasPermission]);

  const canPerform = useMemo(() => {
    return (targetAction: AuditAction): boolean => {
      if (!level) return false;
      return (
        level >= config.minRoleLevel &&
        config.allowedActions.includes(targetAction)
      );
    };
  }, [level, config]);

  const canViewSeverity = useMemo(() => {
    return (targetSeverity: AuditMetadata["severity"]): boolean => {
      if (!level) return false;
      // Niveau 6 = tout voir, niveau 5 = high et below, etc.
      const requiredLevel =
        config.minRoleLevel + (SEVERITY_LEVELS[targetSeverity] - 1);
      return level >= Math.min(requiredLevel, 6);
    };
  }, [level, config]);

  return useMemo(
    () => ({
      allowed,
      metadata: config,
      canPerform,
      canViewSeverity,
      isLogImmutable: config.isImmutable,
    }),
    [allowed, config, canPerform, canViewSeverity],
  );
}
