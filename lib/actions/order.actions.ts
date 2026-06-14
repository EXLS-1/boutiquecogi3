// lib/actions/order.actions.ts
//  This file contains server-side actions related to order management, such as fetching user orders, retrieving specific order details, and updating order statuses. These actions are designed to be used in Next.js server components or API routes, ensuring secure and efficient data handling with Prisma ORM.

"use server";

import { prisma } from "@/lib/prisma";
import { OrderCardData, OrderCardItem } from "@/types/order";
import type { OrderStatus } from "@prisma/client";
import { getServerSession } from "@/lib/auth/server";

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
} as const;

export async function getUserOrders(
  userId: string,
): Promise<ActionResponse<OrderWithItems[]>> {
  try {
    if (!userId) {
      return { success: false, error: "ID utilisateur invalide" };
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
 */
export async function getPaginatedOrders(
  skip: number,
  take: number,
): Promise<ActionResponse<OrderCardData[]>> {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return { success: false, error: "Non autorisé", code: "UNAUTHORIZED" };
    }

    const orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      include: { orderItems: true },
      orderBy: { createdAt: "desc" },
      skip: skip,
      take: take,
    });

    return { success: true, data: orders as unknown as OrderCardData[] };
  } catch (error) {
    console.error("[getPaginatedOrders]", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des commandes",
      code: "PAGINATED_ORDERS_ERROR",
    };
  }
}

export async function getOrderById(
  orderId: string,
): Promise<ActionResponse<OrderWithItems | null>> {
  try {
    if (!orderId) {
      return { success: false, error: "ID de commande invalide" };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });

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

export async function getRecentOrders(
  limit = 10,
): Promise<ActionResponse<OrderWithItems[]>> {
  try {
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const orders = await prisma.order.findMany({
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

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<ActionResponse<OrderWithItems | null>> {
  try {
    if (!orderId) {
      return { success: false, error: "ID de commande invalide" };
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
