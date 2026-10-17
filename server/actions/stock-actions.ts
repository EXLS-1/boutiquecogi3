"use server";

import { StockService } from "@/server/services/stock-service";
import { revalidatePath } from "next/cache";
import { AuthorizationError } from "@/server/core/secure-prisma";
import type { StockMovementType } from "@prisma/client";
import type { ActionResult } from "@/server/core/action-result";
import { recordServerActionAudit, AuditSeverity } from "@/server/services/audit.service";


// ─── Helpers de validation ───

function validateProductId(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("ID produit invalide");
  }
  return raw.trim();
}

function validateNumber(raw: unknown, field: string): number {
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`${field} invalide`);
  }
  return num;
}

// ─── Ajuster le stock (IN / OUT / ADJUSTMENT) ───

export async function adjustStockAction(
  formData: FormData
): Promise<ActionResult> {
  let productId: string;
  let type: StockMovementType;
  let quantity: number;
  let reason: string | undefined;

  try {
    productId = validateProductId(formData.get("productId"));
    type = formData.get("type") as StockMovementType;
    quantity = validateNumber(formData.get("quantity"), "Quantité");
    reason = (formData.get("reason") as string) || undefined;
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Paramètres invalides",
      code: "VALIDATION_ERROR",
    };
  }

  const validTypes: StockMovementType[] = ["IN", "OUT", "ADJUSTMENT", "RETURN"];
  if (!validTypes.includes(type)) {
    return { success: false, error: "Type de mouvement invalide", code: "VALIDATION_ERROR" };
  }

  // Mouvements OUT/ADJUSTMENT qui zeroing peuvent être critiques
  const isDestructive = (type === "OUT" || type === "ADJUSTMENT") && quantity === 0;
  const severity = isDestructive ? AuditSeverity.CRITICAL : AuditSeverity.WARNING;

  try {
    const stock = await StockService.adjust(productId, type, quantity, reason);

    await recordServerActionAudit({
      action: "STOCK_ADJUST",
      targetId: productId,
      targetType: "PRODUCT",
      severity,
      details: { type, quantity, reason },
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath(`/products/${productId}`);

    return { success: true, data: stock, message: `Stock ajusté : ${type} ${quantity} unité(s)` };
  } catch (error) {
    await recordServerActionAudit({
      action: "STOCK_ADJUST",
      targetId: productId,
      targetType: "PRODUCT",
      severity,
      status: "FAILURE",
      error: error instanceof Error ? error.message : "Erreur inconnue",
      details: { type, quantity, reason },
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

// ─── Réserver du stock (commande confirmée) ───

export async function reserveStockAction(
  productId: string,
  quantity: number,
  orderId: string
): Promise<ActionResult> {
  if (!productId || !orderId || quantity <= 0) {
    return { success: false, error: "Paramètres de réservation invalides", code: "VALIDATION_ERROR" };
  }

  try {
    const stock = await StockService.reserve(productId, quantity, orderId);

    await recordServerActionAudit({
      action: "STOCK_RESERVE",
      targetId: productId,
      targetType: "PRODUCT",
      severity: AuditSeverity.INFO,
      details: { quantity, orderId },
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/products/${productId}`);

    return {
      success: true,
      data: stock,
      message: `${quantity} unité(s) réservée(s) pour la commande ${orderId}`,
    };
  } catch (error) {
    await recordServerActionAudit({
      action: "STOCK_RESERVE",
      targetId: productId,
      targetType: "PRODUCT",
      severity: AuditSeverity.WARNING,
      status: "FAILURE",
      error: error instanceof Error ? error.message : "Erreur inconnue",
      details: { quantity, orderId },
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

// ─── Libérer du stock (annulation commande) ───

export async function releaseStockAction(
  productId: string,
  quantity: number,
  orderId: string
): Promise<ActionResult> {
  if (!productId || !orderId || quantity <= 0) {
    return { success: false, error: "Paramètres de libération invalides", code: "VALIDATION_ERROR" };
  }

  try {
    const stock = await StockService.release(productId, quantity, orderId);

    await recordServerActionAudit({
      action: "STOCK_RELEASE",
      targetId: productId,
      targetType: "PRODUCT",
      severity: AuditSeverity.INFO,
      details: { quantity, orderId },
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/products/${productId}`);

    return {
      success: true,
      data: stock,
      message: `${quantity} unité(s) libérée(s) de la commande ${orderId}`,
    };
  } catch (error) {
    await recordServerActionAudit({
      action: "STOCK_RELEASE",
      targetId: productId,
      targetType: "PRODUCT",
      severity: AuditSeverity.WARNING,
      status: "FAILURE",
      error: error instanceof Error ? error.message : "Erreur inconnue",
      details: { quantity, orderId },
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

// ─── Récupérer le stock d'un produit ───

export async function getStockByProductAction(
  productId: string
): Promise<ActionResult> {
  try {
    if (!productId) {
      return {
        success: false,
        error: "ID produit requis",
        code: "VALIDATION_ERROR",
      };
    }

    const stock = await StockService.getByProductId(productId);
    return {
      success: true,
      data: stock,
      message: stock ? "Stock récupéré" : "Aucun stock trouvé",
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Erreur serveur", code: "INTERNAL_ERROR" };
  }
}

// ─── Historique des mouvements ───

export async function getStockMovementsAction(
  productId: string
): Promise<ActionResult> {
  try {
    if (!productId) {
      return {
        success: false,
        error: "ID produit requis",
        code: "VALIDATION_ERROR",
      };
    }

    const stock = await StockService.getByProductId(productId);
    return {
      success: true,
      data: stock?.movements ?? [],
      message: `${stock?.movements.length ?? 0} mouvement(s)`,
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Erreur serveur", code: "INTERNAL_ERROR" };
  }
}

// ─── Lister tous les stocks (Admin) ───

export async function listAllStocksAction(): Promise<ActionResult> {
  try {
    const stocks = await StockService.listAll();
    return {
      success: true,
      data: stocks,
      message: `${stocks.length} stock(s) récupéré(s)`,
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

// ─── Initialiser le stock d'un produit (usage admin) ───

export async function initStockAction(
  productId: string,
  initialQuantity: number = 0
): Promise<ActionResult> {
  if (!productId || initialQuantity < 0) {
    return { success: false, error: "Paramètres invalides", code: "VALIDATION_ERROR" };
  }

  try {
    const stock = await StockService.createForProduct(productId, initialQuantity);

    await recordServerActionAudit({
      action: "STOCK_INIT",
      targetId: productId,
      targetType: "PRODUCT",
      severity: AuditSeverity.INFO,
      details: { initialQuantity },
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${productId}`);

    return {
      success: true,
      data: stock,
      message: `Stock initialisé à ${initialQuantity} unité(s)`,
    };
  } catch (error) {
    await recordServerActionAudit({
      action: "STOCK_INIT",
      targetId: productId,
      targetType: "PRODUCT",
      severity: AuditSeverity.WARNING,
      status: "FAILURE",
      error: error instanceof Error ? error.message : "Erreur inconnue",
      details: { initialQuantity },
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
