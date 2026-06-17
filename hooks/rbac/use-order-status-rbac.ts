// ============================================================
// 2. useOrderStatusRBAC - Statut commande spécifique
// ============================================================
// hooks/rbac/use-order-status-rbac.ts

"use client";

import { useMemo, useCallback } from "react";
import { useRBAC } from "./use-rbac";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "disputed";

interface OrderStatusMetadata {
  color: string;
  isTerminal: boolean;
  allowedTransitions: OrderStatus[];
  requiresApproval: boolean;
  editableBy: number[]; // RoleLevel[] - plus petit = plus haut
}

interface UseOrderStatusRBACReturn {
  allowed: boolean;
  metadata: OrderStatusMetadata;
  canTransitionTo: (targetStatus: OrderStatus) => boolean;
  canCancel: boolean;
  canRefund: boolean;
  canEdit: boolean;
}

const STATUS_METADATA: Record<OrderStatus, OrderStatusMetadata> = {
  pending: {
    color: "#f59e0b",
    isTerminal: false,
    allowedTransitions: ["confirmed", "cancelled"],
    requiresApproval: false,
    editableBy: [3, 4, 5, 6], // Manager, Moderator, Seller, Client
  },
  confirmed: {
    color: "#3b82f6",
    isTerminal: false,
    allowedTransitions: ["processing", "cancelled"],
    requiresApproval: false,
    editableBy: [3, 4, 5, 6],
  },
  processing: {
    color: "#8b5cf6",
    isTerminal: false,
    allowedTransitions: ["shipped", "cancelled"],
    requiresApproval: true,
    editableBy: [3, 4], // Manager, Moderator (pas Seller ni Client)
  },
  shipped: {
    color: "#06b6d4",
    isTerminal: false,
    allowedTransitions: ["delivered", "disputed"],
    requiresApproval: false,
    editableBy: [3, 4],
  },
  delivered: {
    color: "#10b981",
    isTerminal: true,
    allowedTransitions: ["disputed"],
    requiresApproval: false,
    editableBy: [3, 4], // Manager, Moderator
  },
  cancelled: {
    color: "#ef4444",
    isTerminal: true,
    allowedTransitions: [],
    requiresApproval: false,
    editableBy: [3, 4],
  },
  refunded: {
    color: "#f97316",
    isTerminal: true,
    allowedTransitions: [],
    requiresApproval: true,
    editableBy: [3], // Manager uniquement
  },
  disputed: {
    color: "#dc2626",
    isTerminal: false,
    allowedTransitions: ["refunded", "delivered"],
    requiresApproval: true,
    editableBy: [3], // Manager uniquement
  },
};

export function useOrderStatusRBAC(
  status: OrderStatus,
): UseOrderStatusRBACReturn {
  const { level, hasPermission } = useRBAC();

  const metadata = useMemo(() => STATUS_METADATA[status], [status]);

  const allowed = useMemo(() => {
    if (!level) return false;
    // Level doit être dans la liste (plus petit = plus haut)
    const canEditByLevel = metadata.editableBy.includes(level);
    const hasOrderPermission = hasPermission("orders:update");
    return canEditByLevel && hasOrderPermission;
  }, [level, metadata, hasPermission]);

  const canTransitionTo = useCallback(
    (targetStatus: OrderStatus): boolean => {
      if (!allowed) return false;
      return metadata.allowedTransitions.includes(targetStatus);
    },
    [allowed, metadata.allowedTransitions],
  );

  const canCancel = useMemo(() => {
    return allowed && canTransitionTo("cancelled");
  }, [allowed, canTransitionTo]);

  const canRefund = useMemo(() => {
    return (
      allowed &&
      hasPermission("orders:process_refund") &&
      (status === "delivered" || status === "disputed")
    );
  }, [allowed, hasPermission, status]);

  const canEdit = useMemo(() => {
    return allowed && !metadata.isTerminal;
  }, [allowed, metadata.isTerminal]);

  return useMemo(
    () => ({
      allowed,
      metadata,
      canTransitionTo,
      canCancel,
      canRefund,
      canEdit,
    }),
    [allowed, metadata, canTransitionTo, canCancel, canRefund, canEdit],
  );
}
