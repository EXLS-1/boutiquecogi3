"use server";

import { prisma } from "@/lib/prisma";
import { OrderWithItems } from "@/types/order";

// Type standardisé pour les actions serveur
export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * Récupérer les commandes d'un utilisateur
 */
export async function getUserOrders(
  userId: string
): Promise<ActionResponse<OrderWithItems[]>> {
  try {
    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        error: "ID utilisateur invalide"
      };
    }

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        orderItems: {
          include: { product: true }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      data: orders
    };
  } catch (error) {
    console.error("[getUserOrders]", error);
    return {
      success: false,
      error: "Impossible de charger les commandes",
      code: "ORDERS_FETCH_ERROR"
    };
  }
}

/**
 * Récupérer une commande par son ID
 */
export async function getOrderById(
  orderId: string
): Promise<ActionResponse<OrderWithItems | null>> {
  try {
    if (!orderId || typeof orderId !== 'string') {
      return {
        success: false,
        error: "ID de commande invalide"
      };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: { product: true }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return {
      success: true,
      data: order
    };
  } catch (error) {
    console.error("[getOrderById]", error);
    return {
      success: false,
      error: "Impossible de charger la commande",
      code: "ORDER_FETCH_ERROR"
    };
  }
}

/**
 * Récupérer les commandes récentes (pour admin)
 */
export async function getRecentOrders(
  limit: number = 10
): Promise<ActionResponse<OrderWithItems[]>> {
  try {
    if (limit < 1 || limit > 50) {
      return {
        success: false,
        error: "La limite doit être comprise entre 1 et 50"
      };
    }

    const orders = await prisma.order.findMany({
      take: limit,
      include: {
        orderItems: {
          include: { product: true }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      data: orders
    };
  } catch (error) {
    console.error("[getRecentOrders]", error);
    return {
      success: false,
      error: "Impossible de charger les commandes récentes",
      code: "RECENT_ORDERS_FETCH_ERROR"
    };
  }
}

/**
 * Mettre à jour le statut d'une commande
 */
export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<ActionResponse<OrderWithItems | null>> {
  try {
    if (!orderId || typeof orderId !== 'string') {
      return {
        success: false,
        error: "ID de commande invalide"
      };
    }

    const validStatuses = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        error: "Statut invalide"
      };
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: status as any },
      include: {
        orderItems: {
          include: { product: true }
        }
      }
    });

    return {
      success: true,
      data: order
    };
  } catch (error) {
    console.error("[updateOrderStatus]", error);
    return {
      success: false,
      error: "Impossible de mettre à jour le statut de la commande",
      code: "ORDER_UPDATE_ERROR"
    };
  }
}