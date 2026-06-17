// ============================================================
// 7. usePaymentMethodRBAC - Méthode paiement
// ============================================================
// hooks/rbac/use-payment-method-rbac.ts
("use client");

import { useMemo } from "react";
import { useRBAC } from "./use-rbac";

export type PaymentMethod =
  | "cinetpay_card"
  | "cinetpay_mobile"
  | "cinetpay_bank"
  | "cash_on_delivery"
  | "bank_transfer"
  | "crypto";

export type PaymentAction =
  | "process"
  | "refund"
  | "configure"
  | "view_analytics"
  | "disable";

interface PaymentMethodMetadata {
  maxTransactionAmount: number;
  allowedActions: PaymentAction[];
  minRoleLevel: number; // Plus petit = plus haut
  requires2FA: boolean;
  isEnabled: boolean;
  currencySupport: string[];
  processingFee: number;
}

interface UsePaymentMethodRBACReturn {
  allowed: boolean;
  metadata: PaymentMethodMetadata;
  canPerform: (action: PaymentAction) => boolean;
  canProcessAmount: (amount: number) => boolean;
  isAvailable: boolean;
}

const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, PaymentMethodMetadata> = {
  cinetpay_card: {
    maxTransactionAmount: 1000000,
    allowedActions: [
      "process",
      "refund",
      "configure",
      "view_analytics",
      "disable",
    ],
    minRoleLevel: 6, // Tous (Client+)
    requires2FA: false,
    isEnabled: true,
    currencySupport: ["XOF", "XAF", "EUR"],
    processingFee: 2.5,
  },
  cinetpay_mobile: {
    maxTransactionAmount: 500000,
    allowedActions: ["process", "refund", "configure", "view_analytics"],
    minRoleLevel: 6,
    requires2FA: false,
    isEnabled: true,
    currencySupport: ["XOF", "XAF"],
    processingFee: 1.5,
  },
  cinetpay_bank: {
    maxTransactionAmount: 5000000,
    allowedActions: [
      "process",
      "refund",
      "configure",
      "view_analytics",
      "disable",
    ],
    minRoleLevel: 3, // Manager+
    requires2FA: true,
    isEnabled: true,
    currencySupport: ["XOF", "XAF", "EUR", "USD"],
    processingFee: 1.0,
  },
  cash_on_delivery: {
    maxTransactionAmount: 200000,
    allowedActions: ["process", "disable"],
    minRoleLevel: 4, // Moderator+
    requires2FA: false,
    isEnabled: true,
    currencySupport: ["XOF"],
    processingFee: 0,
  },
  bank_transfer: {
    maxTransactionAmount: 10000000,
    allowedActions: ["process", "refund", "configure", "view_analytics"],
    minRoleLevel: 3, // Manager+
    requires2FA: true,
    isEnabled: false,
    currencySupport: ["XOF", "EUR", "USD"],
    processingFee: 0.5,
  },
  crypto: {
    maxTransactionAmount: 5000000,
    allowedActions: ["process", "view_analytics"],
    minRoleLevel: 2, // Admin+
    requires2FA: true,
    isEnabled: false,
    currencySupport: ["BTC", "ETH", "USDT"],
    processingFee: 1.0,
  },
};

export function usePaymentMethodRBAC(
  method: PaymentMethod,
  action: PaymentAction,
): UsePaymentMethodRBACReturn {
  const { level, hasPermission } = useRBAC();

  const config = useMemo(() => PAYMENT_METHOD_CONFIG[method], [method]);

  const allowed = useMemo(() => {
    if (!level) return false;
    const meetsLevel = level <= config.minRoleLevel;
    const hasPaymentPermission =
      hasPermission("payments:read") || hasPermission("payments:configure");
    const actionAllowed = config.allowedActions.includes(action);
    return (
      meetsLevel && hasPaymentPermission && actionAllowed && config.isEnabled
    );
  }, [level, config, action, hasPermission]);

  const canPerform = useMemo(() => {
    return (targetAction: PaymentAction): boolean => {
      if (!level) return false;
      return (
        level <= config.minRoleLevel &&
        config.allowedActions.includes(targetAction) &&
        config.isEnabled
      );
    };
  }, [level, config]);

  const canProcessAmount = useMemo(() => {
    return (amount: number): boolean => {
      return amount <= config.maxTransactionAmount;
    };
  }, [config]);

  const isAvailable = useMemo(() => {
    return config.isEnabled && !!level && level <= config.minRoleLevel;
  }, [config, level]);

  return useMemo(
    () => ({
      allowed,
      metadata: config,
      canPerform,
      canProcessAmount,
      isAvailable,
    }),
    [allowed, config, canPerform, canProcessAmount, isAvailable],
  );
}
