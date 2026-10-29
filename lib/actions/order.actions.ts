// lib/actions/order.actions.ts
// Actions sécurisées pour la gestion des commandes avec isolation stricte des utilisateurs
// Règle d'or : aucun utilisateur ne peut voir ni modifier les commandes d'un autre utilisateur sauf permission RBAC.

"use server";

import { prisma } from "@/lib/prisma";
import { OrderCardData } from "@/types/order";
import type { OrderStatusEnum as OrderStatus, Prisma } from "@prisma/client";
import { resolveAuthContext, assertAccessUserData, logAudit } from "@/lib/auth/server";
import { mapOrdersToCards } from "@/lib/orders/map-order-to-card";

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

const orderInclude = {
  items: {
    include: {
      variant: {
        include: { product: true },
      },
    },
  },
  user: {
    select: { id: true, name: true, email: true },
  },
} satisfies Prisma.OrderInclude;

type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

/**
 * Récupère les commandes d'un utilisateur spécifique.
 * ISOLATION STRICTE : Autorisé uniquement pour le propriétaire du compte
 * ou un membre du personnel disposant des permissions RBAC (Level <= 3 ou 'order:read:any').
 */
export async function getUserOrders(
  userId: string,
): Promise<ActionResponse<OrderWithItems[]>> {
  try {
    if (!userId || typeof userId !== "string") {
      return { success: false, error: "ID utilisateur invalide", code: "INVALID_USER_ID" };
    }

    const authContext = await resolveAuthContext();
    if (!authContext?.user) {
      return { success: false, error: "Non authentifié", code: "UNAUTHENTICATED" };
    }

    try {
      assertAccessUserData(authContext, userId, ["order:read:any", "orders:read"], {
        minRoleLevel: 3, // Level 1 (Super-Admin), Level 2 (Admin), Level 3 (Manager)
        action: "orders:read_user_orders",
        resource: "order",
        resourceId: userId,
      });
    } catch {
      return {
        success: false,
        error: "Accès refusé : vous n'êtes pas autorisé à consulter les commandes d'un autre utilisateur.",
        code: "FORBIDDEN",
      };
    }

    const orders = await prisma.order.findMany({
      where: { userId },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: orders as OrderWithItems[] };
  } catch (error) {
    console.error("[getUserOrders]", error);
    return {
      success: false,
      error: "Impossible de charger les commandes",
      code: "ORDERS_FETCH_ERROR",
    };
  }
}

/**
 * Récupère les commandes de l'utilisateur connecté de manière paginée.
 * ISOLATION GARANTIE : Bindé directement sur `authContext.user.id`.
 */
export async function getPaginatedOrders(
  skip: number,
  take: number,
): Promise<ActionResponse<OrderCardData[]>> {
  try {
    const authContext = await resolveAuthContext();

    if (!authContext?.user) {
      return { success: false, error: "Non autorisé", code: "UNAUTHORIZED" };
    }

    const orders = await prisma.order.findMany({
      where: { userId: authContext.user.id },
      include: { items: true, orderAddresses: true },
      orderBy: { createdAt: "desc" },
      skip: Math.max(0, skip),
      take: Math.max(1, take),
    });

    return { success: true, data: mapOrdersToCards(orders) };
  } catch (error) {
    console.error("[getPaginatedOrders]", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des commandes",
      code: "PAGINATED_ORDERS_ERROR",
    };
  }
}

/**
 * Récupère le détail complet d'une commande par son identifiant.
 * SÉCURITÉ ANTI-IDOR : Vérifie que la commande appartient à l'utilisateur courant,
 * ou que l'utilisateur détient la permission RBAC de consultation des commandes tierces.
 */
export async function getOrderById(
  orderId: string,
): Promise<ActionResponse<OrderWithItems | null>> {
  try {
    if (!orderId || typeof orderId !== "string") {
      return { success: false, error: "ID de commande invalide", code: "INVALID_ORDER_ID" };
    }

    const authContext = await resolveAuthContext();
    if (!authContext?.user) {
      return { success: false, error: "Non authentifié", code: "UNAUTHENTICATED" };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });

    if (!order) {
      return { success: false, error: "Commande introuvable", code: "ORDER_NOT_FOUND" };
    }

    try {
      assertAccessUserData(authContext, order.userId, ["order:read:any", "orders:read"], {
        minRoleLevel: 3,
        action: "order:read_single",
        resource: "order",
        resourceId: orderId,
      });
    } catch {
      return {
        success: false,
        error: "Accès refusé : vous n'êtes pas autorisé à consulter la commande d'un autre utilisateur.",
        code: "FORBIDDEN",
      };
    }

    return { success: true, data: (order as OrderWithItems) ?? null };
  } catch (error) {
    console.error("[getOrderById]", error);
    return {
      success: false,
      error: "Impossible de charger la commande",
      code: "ORDER_FETCH_ERROR",
    };
  }
}

/**
 * Récupère les commandes récentes.
 * Si l'utilisateur est staff (RBAC Level <= 3 ou permissions globales), renvoie les commandes globales.
 * Si l'utilisateur est un client classique, filtre STRICTEMENT sur ses propres commandes.
 */
export async function getRecentOrders(
  limit = 10,
): Promise<ActionResponse<OrderWithItems[]>> {
  try {
    const authContext = await resolveAuthContext();
    if (!authContext?.user) {
      return { success: false, error: "Non authentifié", code: "UNAUTHENTICATED" };
    }

    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const isStaff =
      authContext.permissions.has("order:read:any") ||
      authContext.permissions.has("orders:read") ||
      authContext.user.level <= 3;

    // Cloisonnement strict : un client ne voit QUE ses propres commandes récentes
    const where = isStaff ? {} : { userId: authContext.user.id };

    const orders = await prisma.order.findMany({
      where,
      take: safeLimit,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: orders as OrderWithItems[] };
  } catch (error) {
    console.error("[getRecentOrders]", error);
    return {
      success: false,
      error: "Impossible de charger les commandes récentes",
      code: "RECENT_ORDERS_FETCH_ERROR",
    };
  }
}

/**
 * Met à jour le statut d'une commande.
 * STRICTEMENT RÉSERVÉ au personnel administratif / superviseur (Level <= 3 ou 'order:status:update').
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<ActionResponse<OrderWithItems | null>> {
  try {
    if (!orderId) {
      return { success: false, error: "ID de commande invalide", code: "INVALID_ORDER_ID" };
    }

    const authContext = await resolveAuthContext();
    if (!authContext?.user) {
      return { success: false, error: "Non authentifié", code: "UNAUTHENTICATED" };
    }

    const hasPermission =
      authContext.permissions.has("order:status:update") ||
      authContext.permissions.has("orders:update") ||
      authContext.user.level <= 3;

    if (!hasPermission) {
      void logAudit({
        userId: authContext.user.id,
        role: authContext.user.role,
        roleLevel: authContext.user.level,
        action: "order:status_update_forbidden",
        resource: "order",
        resourceId: orderId,
        success: false,
        details: `Tentative non autorisée de mise à jour du statut vers ${status}`,
      });

      return {
        success: false,
        error: "Accès refusé : privilèges insuffisants pour modifier le statut d'une commande.",
        code: "FORBIDDEN",
      };
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: orderInclude,
    });

    return { success: true, data: order as OrderWithItems };
  } catch (error) {
    console.error("[updateOrderStatus]", error);
    return {
      success: false,
      error: "Impossible de mettre à jour le statut de la commande",
      code: "ORDER_UPDATE_ERROR",
    };
  }
}
