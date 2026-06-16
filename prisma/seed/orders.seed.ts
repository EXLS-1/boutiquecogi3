// prisma/seed/orders.seed.ts
import { PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/uuid";
import { ROLES, PERMISSIONS } from "@/lib/auth/rbac";

interface OrderStatusConfig {
  status: string;
  label: string;
  description: string;
  color: string;
  whoCanSet: string[];
  requiredPermission: string;
  minRoleLevel: number;
  isTerminal: boolean;
  triggersNotification: boolean;
}

const ORDER_STATUSES: OrderStatusConfig[] = [
  {
    status: "PENDING", label: "En attente", description: "Commande reçue, en attente de validation",
    color: "#F59E0B", whoCanSet: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.USER],
    requiredPermission: PERMISSIONS.ORDERS_CREATE, minRoleLevel: 6, isTerminal: false, triggersNotification: true,
  },
  {
    status: "CONFIRMED", label: "Confirmée", description: "Commande validée par le système",
    color: "#3B82F6", whoCanSet: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],
    requiredPermission: PERMISSIONS.ORDERS_UPDATE, minRoleLevel: 5, isTerminal: false, triggersNotification: true,
  },
  {
    status: "PROCESSING", label: "En préparation", description: "Commande en cours de préparation",
    color: "#8B5CF6", whoCanSet: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],
    requiredPermission: PERMISSIONS.ORDERS_UPDATE, minRoleLevel: 5, isTerminal: false, triggersNotification: true,
  },
  {
    status: "SHIPPED", label: "Expédiée", description: "Commande expédiée au client",
    color: "#06B6D4", whoCanSet: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],
    requiredPermission: PERMISSIONS.ORDERS_UPDATE, minRoleLevel: 5, isTerminal: false, triggersNotification: true,
  },
  {
    status: "DELIVERED", label: "Livrée", description: "Commande livrée avec succès",
    color: "#10B981", whoCanSet: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],
    requiredPermission: PERMISSIONS.ORDERS_UPDATE, minRoleLevel: 5, isTerminal: true, triggersNotification: true,
  },
  {
    status: "CANCELLED", label: "Annulée", description: "Commande annulée",
    color: "#EF4444", whoCanSet: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],
    requiredPermission: PERMISSIONS.ORDERS_CANCEL, minRoleLevel: 5, isTerminal: true, triggersNotification: true,
  },
  {
    status: "REFUNDED", label: "Remboursée", description: "Commande remboursée intégralement",
    color: "#F97316", whoCanSet: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    requiredPermission: PERMISSIONS.ORDERS_REFUND, minRoleLevel: 3, isTerminal: true, triggersNotification: true,
  },
  {
    status: "DISPUTED", label: "Contestée", description: "Litige en cours avec le client",
    color: "#DC2626", whoCanSet: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    requiredPermission: PERMISSIONS.ORDERS_UPDATE, minRoleLevel: 3, isTerminal: false, triggersNotification: true,
  },
];

interface CheckoutConfig {
  step: string; label: string; description: string;
  requiredPermission: string; minRoleLevel: number;
  isGuestAllowed: boolean; requiresAuth: boolean;
}

const CHECKOUT_STEPS: CheckoutConfig[] = [
  { step: "CART", label: "Panier", description: "Révision des articles sélectionnés",
    requiredPermission: PERMISSIONS.PRODUCTS_READ, minRoleLevel: 6, isGuestAllowed: true, requiresAuth: false },
  { step: "SHIPPING", label: "Livraison", description: "Sélection de l'adresse et méthode de livraison",
    requiredPermission: PERMISSIONS.ORDERS_CREATE, minRoleLevel: 6, isGuestAllowed: true, requiresAuth: false },
  { step: "PAYMENT", label: "Paiement", description: "Paiement via CinetPay",
    requiredPermission: PERMISSIONS.ORDERS_CREATE, minRoleLevel: 6, isGuestAllowed: false, requiresAuth: true },
  { step: "CONFIRMATION", label: "Confirmation", description: "Récapitulatif et confirmation finale",
    requiredPermission: PERMISSIONS.ORDERS_CREATE, minRoleLevel: 6, isGuestAllowed: false, requiresAuth: true },
];

export async function seedOrderStatuses(prisma: PrismaClient) {
  console.log("📦 [RBAC] Configuration des statuts de commande...");
  for (const config of ORDER_STATUSES) {
    await prisma.orderStatus.upsert({
      where: { status: config.status },
      update: {
        label: config.label, description: config.description, color: config.color,
        whoCanSet: config.whoCanSet, requiredPermission: config.requiredPermission,
        minRoleLevel: config.minRoleLevel, isTerminal: config.isTerminal,
        triggersNotification: config.triggersNotification,
      },
      create: {
        id: generateUUIDv7(), status: config.status, label: config.label,
        description: config.description, color: config.color,
        whoCanSet: config.whoCanSet, requiredPermission: config.requiredPermission,
        minRoleLevel: config.minRoleLevel, isTerminal: config.isTerminal,
        triggersNotification: config.triggersNotification,
      },
    });
    console.log(`   ✓ ${config.label} [minLevel:${config.minRoleLevel}, terminal:${config.isTerminal}]`);
  }
  console.log(`📦 [RBAC] ${ORDER_STATUSES.length} statuts de commande synchronisés.`);
}

export async function seedCheckoutConfig(prisma: PrismaClient) {
  console.log("🛒 [RBAC] Configuration du workflow de checkout...");
  for (const step of CHECKOUT_STEPS) {
    await prisma.checkoutStep.upsert({
      where: { step: step.step },
      update: {
        label: step.label, description: step.description,
        requiredPermission: step.requiredPermission, minRoleLevel: step.minRoleLevel,
        isGuestAllowed: step.isGuestAllowed, requiresAuth: step.requiresAuth,
      },
      create: {
        id: generateUUIDv7(), step: step.step, label: step.label,
        description: step.description, requiredPermission: step.requiredPermission,
        minRoleLevel: step.minRoleLevel, isGuestAllowed: step.isGuestAllowed,
        requiresAuth: step.requiresAuth, displayOrder: CHECKOUT_STEPS.indexOf(step),
      },
    });
    console.log(`   ✓ ${step.label} [auth:${step.requiresAuth}, guest:${step.isGuestAllowed}]`);
  }
  console.log(`🛒 [RBAC] ${CHECKOUT_STEPS.length} étapes de checkout configurées.`);
}
