import { Currency, PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/utils/uuid";
import { ROLES, PERMISSIONS, LEVELS } from "@/lib/auth/rbac";

interface PaymentMethodConfig {
  method: string;
  label: string;
  description: string;
  provider: string;
  isActive: boolean;
  whoCanConfigure: string[];
  whoCanViewTransactions: string[];
  requiredPermissionConfigure: string;
  requiredPermissionView: string;
  minRoleLevelConfigure: number;
  minRoleLevelView: number;
  requiresApproval: boolean;
  maxTransactionAmount: number;
  currency: Currency;
}

const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    method: "CINETPAY_MOBILE", label: "CinetPay Mobile Money",
    description: "Paiement via Mobile Money (MPesa, Orange Money, Airtel Money)",
    provider: "CinetPay", isActive: true,
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    whoCanViewTransactions: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    requiredPermissionConfigure: PERMISSIONS["settings:billing"],
    requiredPermissionView: PERMISSIONS["analytics:read"],
    minRoleLevelConfigure: LEVELS.LEVEL_2, minRoleLevelView: LEVELS.LEVEL_3,
    requiresApproval: false, maxTransactionAmount: 50000000, currency: "USD",
  },
  {
    method: "CINETPAY_CARD", label: "CinetPay Carte Bancaire",
    description: "Paiement par carte Visa/Mastercard via CinetPay",
    provider: "CinetPay", isActive: true,
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    whoCanViewTransactions: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    requiredPermissionConfigure: PERMISSIONS["settings:billing"],
    requiredPermissionView: PERMISSIONS["analytics:read"],
    minRoleLevelConfigure: LEVELS.LEVEL_2, minRoleLevelView: LEVELS.LEVEL_3,
    requiresApproval: true, maxTransactionAmount: 100000000, currency: "USD",
  },
  {
    method: "CASH_ON_DELIVERY", label: "Paiement à la livraison",
    description: "Paiement en espèces lors de la livraison",
    provider: "Internal", isActive: true,
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    whoCanViewTransactions: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],
    requiredPermissionConfigure: PERMISSIONS["settings:billing"],
    requiredPermissionView: PERMISSIONS["orders:read"],
    minRoleLevelConfigure: LEVELS.LEVEL_3, minRoleLevelView: LEVELS.LEVEL_5,
    requiresApproval: false, maxTransactionAmount: 20000000, currency: "USD",
  },
  {
    method: "BANK_TRANSFER", label: "Virement bancaire",
    description: "Paiement par virement bancaire",
    provider: "Bank", isActive: false,
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    whoCanViewTransactions: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    requiredPermissionConfigure: PERMISSIONS["settings:billing"],
    requiredPermissionView: PERMISSIONS["analytics:read"],
    minRoleLevelConfigure: LEVELS.LEVEL_2, minRoleLevelView: LEVELS.LEVEL_2,
    requiresApproval: true, maxTransactionAmount: 500000000, currency: "USD",
  },
];

interface FinancialThreshold {
  thresholdName: string;
  label: string;
  description: string;
  amount: number;
  currency: Currency;
  whoCanOverride: string[];
  requiredPermissionOverride: string;
  minRoleLevelOverride: number;
  triggersAlert: boolean;
  alertRecipients: string[];
}

const FINANCIAL_THRESHOLDS: FinancialThreshold[] = [
  {
    thresholdName: "DAILY_REVENUE_ALERT", label: "Alerte revenus journaliers",
    description: "Seuil d'alerte pour les revenus quotidiens",
    amount: 10000000, currency: "USD",
    whoCanOverride: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    requiredPermissionOverride: PERMISSIONS["settings:billing"],
    minRoleLevelOverride: LEVELS.LEVEL_2, triggersAlert: true,
    alertRecipients: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    thresholdName: "REFUND_LIMIT_DAILY", label: "Limite remboursements journaliers",
    description: "Montant maximum de remboursements par jour",
    amount: 5000000, currency: "USD",
    whoCanOverride: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    requiredPermissionOverride: PERMISSIONS["orders:refund"],
    minRoleLevelOverride: LEVELS.LEVEL_2, triggersAlert: true,
    alertRecipients: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    thresholdName: "HIGH_VALUE_ORDER", label: "Commande haute valeur",
    description: "Seuil pour les commandes nécessitant une vérification manuelle",
    amount: 2500000, currency: "USD",
    whoCanOverride: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    requiredPermissionOverride: PERMISSIONS["orders:update"],
    minRoleLevelOverride: LEVELS.LEVEL_3, triggersAlert: true,
    alertRecipients: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    thresholdName: "SUSPICIOUS_TRANSACTION", label: "Transaction suspecte",
    description: "Seuil déclenchant une analyse anti-fraude",
    amount: 500000, currency: "USD",
    whoCanOverride: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    requiredPermissionOverride: PERMISSIONS["settings:billing"],
    minRoleLevelOverride: LEVELS.LEVEL_2, triggersAlert: true,
    alertRecipients: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
];

export async function seedPaymentMethods(prisma: PrismaClient) {
  console.log("💰 [RBAC] Configuration atomique des méthodes de paiement...");

  await prisma.$transaction(
    PAYMENT_METHODS.map((method) =>
      prisma.paymentMethodConfig.upsert({
        where: { method: method.method },
        update: {
          label: method.label, description: method.description, provider: method.provider,
          isActive: method.isActive, whoCanConfigure: method.whoCanConfigure,
          whoCanViewTransactions: method.whoCanViewTransactions,
          requiredPermissionConfigure: method.requiredPermissionConfigure,
          requiredPermissionView: method.requiredPermissionView,
          minRoleLevelConfigure: method.minRoleLevelConfigure,
          minRoleLevelView: method.minRoleLevelView,
          requiresApproval: method.requiresApproval,
          maxTransactionAmount: method.maxTransactionAmount, currency: method.currency,
        },
        create: {
          id: generateUUIDv7(), method: method.method, label: method.label,
          description: method.description, provider: method.provider, isActive: method.isActive,
          whoCanConfigure: method.whoCanConfigure, whoCanViewTransactions: method.whoCanViewTransactions,
          requiredPermissionConfigure: method.requiredPermissionConfigure,
          requiredPermissionView: method.requiredPermissionView,
          minRoleLevelConfigure: method.minRoleLevelConfigure,
          minRoleLevelView: method.minRoleLevelView,
          requiresApproval: method.requiresApproval,
          maxTransactionAmount: method.maxTransactionAmount, currency: method.currency,
        },
      })
    )
  );

  console.log(`💰 [RBAC] ${PAYMENT_METHODS.length} méthodes de paiement configurées.`);
}

export async function seedFinancialThresholds(prisma: PrismaClient) {
  console.log("📊 [RBAC] Configuration atomique des seuils financiers...");

  await prisma.$transaction(
    FINANCIAL_THRESHOLDS.map((threshold) =>
      prisma.financialThreshold.upsert({
        where: { thresholdName: threshold.thresholdName },
        update: {
          label: threshold.label, description: threshold.description,
          amount: threshold.amount, currency: threshold.currency,
          whoCanOverride: threshold.whoCanOverride,
          requiredPermissionOverride: threshold.requiredPermissionOverride,
          minRoleLevelOverride: threshold.minRoleLevelOverride,
          triggersAlert: threshold.triggersAlert, alertRecipients: threshold.alertRecipients,
        },
        create: {
          id: generateUUIDv7(), thresholdName: threshold.thresholdName, label: threshold.label,
          description: threshold.description, amount: threshold.amount, currency: threshold.currency,
          whoCanOverride: threshold.whoCanOverride,
          requiredPermissionOverride: threshold.requiredPermissionOverride,
          minRoleLevelOverride: threshold.minRoleLevelOverride,
          triggersAlert: threshold.triggersAlert, alertRecipients: threshold.alertRecipients,
        },
      })
    )
  );

  console.log(`📊 [RBAC] ${FINANCIAL_THRESHOLDS.length} seuils financiers configurés.`);
}
