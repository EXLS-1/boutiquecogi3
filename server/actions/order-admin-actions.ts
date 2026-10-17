// server/actions/order-admin-actions.ts

"use server";

import { OrderAdminService } from "@/server/services/order-admin-service";
import { AuthorizationError } from "@/server/core/secure-prisma";
import { revalidatePath } from "next/cache";
import type { OrderStatusEnum as OrderStatus } from "@prisma/client";
import type { ActionResult } from "@/server/core/action-result";
import { recordServerActionAudit, AuditSeverity } from "@/server/services/audit.service";

// Statuts qui constituent des opérations critiques irréversibles
const CRITICAL_STATUSES: Set<OrderStatus> = new Set(["CANCELLED", "REFUNDED"]);


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

  const isCritical = CRITICAL_STATUSES.has(newStatus);
  const severity = isCritical ? AuditSeverity.CRITICAL : AuditSeverity.WARNING;

  try {
    const result = await OrderAdminService.updateStatus(orderId, newStatus, reason);

    await recordServerActionAudit({
      action: "ORDER_STATUS_UPDATE",
      targetId: orderId,
      targetType: "ORDER",
      severity,
      details: { newStatus, reason },
    });

    revalidatePath("/admin/order");
    revalidatePath(`/admin/order/${orderId}`);

    return { success: true, data: result, message: `Statut mis à jour: ${newStatus}` };
  } catch (error) {
    await recordServerActionAudit({
      action: "ORDER_STATUS_UPDATE",
      targetId: orderId,
      targetType: "ORDER",
      severity,
      status: "FAILURE",
      error: error instanceof Error ? error.message : "Erreur inconnue",
      details: { newStatus, reason },
    });

    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message, code: error.code };
    }
    if (error instanceof Error) {
      return { success: false, error: error.message, code: "SERVICE_ERROR" };
    }
    return { success: false, error: "Erreur serveur", code: "INTERNAL_ERROR" };
  }
}

// ─── Annuler une commande ───

export async function cancelOrderAction(
  orderId: string,
  reason?: string
): Promise<ActionResult> {
  if (!orderId) {
    return { success: false, error: "ID commande requis", code: "VALIDATION_ERROR" };
  }

  try {
    const result = await OrderAdminService.cancel(orderId, reason);

    await recordServerActionAudit({
      action: "ORDER_CANCEL",
      targetId: orderId,
      targetType: "ORDER",
      severity: AuditSeverity.CRITICAL,
      details: { reason },
    });

    revalidatePath("/admin/order");
    revalidatePath(`/admin/order/${orderId}`);

    return { success: true, data: result, message: "Commande annulée" };
  } catch (error) {
    await recordServerActionAudit({
      action: "ORDER_CANCEL",
      targetId: orderId,
      targetType: "ORDER",
      severity: AuditSeverity.CRITICAL,
      status: "FAILURE",
      error: error instanceof Error ? error.message : "Erreur inconnue",
      details: { reason },
    });

    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message, code: error.code };
    }
    if (error instanceof Error) {
      return { success: false, error: error.message, code: "SERVICE_ERROR" };
    }
    return { success: false, error: "Erreur serveur", code: "INTERNAL_ERROR" };
  }
}
