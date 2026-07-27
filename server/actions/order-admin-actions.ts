// server/actions/order-admin-actions.ts

"use server";

import { OrderAdminService } from "@/server/services/order-admin-service";
import { AuthorizationError } from "@/server/core/secure-prisma";
import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";

type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | {
      success: false;
      error: string;
      code: string;
      fieldErrors?: Record<string, string[]>;
    };

// ─── Récupérer toutes les commandes (Admin) ───

export async function getAllOrdersAdmin(): Promise<ActionResult> {
  try {
    const orders = await OrderAdminService.listAll();
    return {
      success: true,
      data: orders,
      message: `${orders.length} commande(s) récupérée(s)`,
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message, code: error.code };
    }
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
        code:
          "code" in error
            ? String((error as Record<string, unknown>).code ?? "") ||
              "UNKNOWN_ERROR"
            : "UNKNOWN_ERROR",
      };
    }
    return { success: false, error: "Erreur serveur", code: "INTERNAL_ERROR" };
  }
}

// ─── Mettre à jour le statut d'une commande ───

export async function updateOrderStatusAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const orderId = formData.get("orderId") as string;
    const newStatus = formData.get("status") as OrderStatus;
    const reason = (formData.get("reason") as string) || undefined;

    if (!orderId || !newStatus) {
      return {
        success: false,
        error: "Paramètres requis manquants (orderId, status)",
        code: "VALIDATION_ERROR",
      };
    }

    const validStatuses: OrderStatus[] = [
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "REFUNDED",
    ];

    if (!validStatuses.includes(newStatus)) {
      return {
        success: false,
        error: `Statut invalide: ${newStatus}`,
        code: "VALIDATION_ERROR",
      };
    }

    const result = await OrderAdminService.updateStatus(
      orderId,
      newStatus,
      reason
    );
    revalidatePath("/admin/order");
    revalidatePath(`/admin/order/${orderId}`);

    return {
      success: true,
      data: result,
      message: `Statut mis à jour: ${newStatus}`,
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message, code: error.code };
    }
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
        code: "SERVICE_ERROR",
      };
    }
    return { success: false, error: "Erreur serveur", code: "INTERNAL_ERROR" };
  }
}

// ─── Annuler une commande ───

export async function cancelOrderAction(
  orderId: string,
  reason?: string
): Promise<ActionResult> {
  try {
    if (!orderId) {
      return {
        success: false,
        error: "ID commande requis",
        code: "VALIDATION_ERROR",
      };
    }

    const result = await OrderAdminService.cancel(orderId, reason);
    revalidatePath("/admin/order");
    revalidatePath(`/admin/order/${orderId}`);

    return {
      success: true,
      data: result,
      message: "Commande annulée",
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message, code: error.code };
    }
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
        code: "SERVICE_ERROR",
      };
    }
    return { success: false, error: "Erreur serveur", code: "INTERNAL_ERROR" };
  }
}
