"use server";

import { StockService } from "@/server/services/stock-service";
import { revalidatePath } from "next/cache";
import { AuthorizationError } from "@/server/core/secure-prisma";
import type { StockMovementType } from "@prisma/client";

type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | {
      success: false;
      error: string;
      code: string;
      fieldErrors?: Record<string, string[]>;
    };

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
  try {
    const productId = validateProductId(formData.get("productId"));
    const type = formData.get("type") as StockMovementType;
    const quantity = validateNumber(formData.get("quantity"), "Quantité");
    const reason = (formData.get("reason") as string) || undefined;

    const validTypes: StockMovementType[] = [
      "IN",
      "OUT",
      "ADJUSTMENT",
      "RETURN",
    ];
    if (!validTypes.includes(type)) {
      return {
        success: false,
        error: "Type de mouvement invalide",
        code: "VALIDATION_ERROR",
      };
    }

    const stock = await StockService.adjust(productId, type, quantity, reason);
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath(`/products/${productId}`);

    return {
      success: true,
      data: stock,
      message: `Stock ajusté : ${type} ${quantity} unité(s)`,
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

// ─── Réserver du stock (commande confirmée) ───

export async function reserveStockAction(
  productId: string,
  quantity: number,
  orderId: string
): Promise<ActionResult> {
  try {
    if (!productId || !orderId || quantity <= 0) {
      return {
        success: false,
        error: "Paramètres de réservation invalides",
        code: "VALIDATION_ERROR",
      };
    }

    const stock = await StockService.reserve(productId, quantity, orderId);
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/products/${productId}`);

    return {
      success: true,
      data: stock,
      message: `${quantity} unité(s) réservée(s) pour la commande ${orderId}`,
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

// ─── Libérer du stock (annulation commande) ───

export async function releaseStockAction(
  productId: string,
  quantity: number,
  orderId: string
): Promise<ActionResult> {
  try {
    if (!productId || !orderId || quantity <= 0) {
      return {
        success: false,
        error: "Paramètres de libération invalides",
        code: "VALIDATION_ERROR",
      };
    }

    const stock = await StockService.release(productId, quantity, orderId);
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/products/${productId}`);

    return {
      success: true,
      data: stock,
      message: `${quantity} unité(s) libérée(s) de la commande ${orderId}`,
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
  try {
    if (!productId || initialQuantity < 0) {
      return {
        success: false,
        error: "Paramètres invalides",
        code: "VALIDATION_ERROR",
      };
    }

    const stock = await StockService.createForProduct(
      productId,
      initialQuantity
    );
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${productId}`);

    return {
      success: true,
      data: stock,
      message: `Stock initialisé à ${initialQuantity} unité(s)`,
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
