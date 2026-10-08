"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { hasPermission, resolvePermissionCode } from "@/lib/auth/rbac";
import { requireAuth } from "@/lib/auth/session-provider";
import { actionError, actionSuccess } from "./_shared/action-result";
import { ProductError } from "@/lib/product/product-errors";
import { getVariantById } from "@/lib/product/product-service-helpers";
import { adjustStock, transferStock } from "@/lib/product/inventory/inventory.service";
import { releaseStock, reserveStock } from "@/lib/product/inventory/reservation.service";
import { InventoryError } from "@/lib/product/inventory/inventory.types";

const AdjustStockSchema = z.object({
  variantId: z.string().uuid("ID de variante invalide"),
  warehouseId: z.string().uuid().nullable().optional(),
  delta: z.number().int().min(-10000, "Delta trop négatif").max(10000, "Delta trop positif"),
  reason: z.string().max(500, "La raison est trop longue").optional(),
});

export async function adjustStockAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = AdjustStockSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour ajuster le stock");
  }

  try {
    const variant = await getVariantById(data.variantId);
    if (!variant) {
      return actionError("NOT_FOUND", "Variante introuvable");
    }

    const result = await adjustStock({
      variantId: data.variantId,
      warehouse: data.warehouseId,
      delta: data.delta,
      reason: "ADJUSTMENT",
      notes: data.reason ?? "Ajustement manuel",
      userId: user.id,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${variant.productId}`);
    revalidatePath(`/admin/products/${variant.productId}/inventory`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("STOCK_ADJUSTED", "Stock ajusté avec succès", result);
  } catch (error) {
    if (error instanceof InventoryError || error instanceof ProductError) {
      return actionError(
        error.code,
        error.message,
        error instanceof ProductError ? error.details : undefined,
      );
    }
    console.error("adjustStockAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de l'ajustement du stock");
  }
}

const ReleaseStockSchema = z.object({
  variantId: z.string().uuid("ID de variante invalide"),
  warehouseId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().positive("La quantité doit être un entier positif").max(10000),
  orderId: z.string().uuid().optional(),
  reason: z.string().max(500).optional(),
});

export async function releaseStockAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = ReleaseStockSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour libérer le stock");
  }

  try {
    const variant = await getVariantById(data.variantId);
    if (!variant) {
      return actionError("NOT_FOUND", "Variante introuvable");
    }

    const result = await releaseStock(data.variantId, {
      warehouse: data.warehouseId,
      quantity: data.quantity,
      userId: user.id,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${variant.productId}`);
    revalidatePath(`/admin/products/${variant.productId}/inventory`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("STOCK_RELEASED", "Stock libéré avec succès", result);
  } catch (error) {
    if (error instanceof InventoryError || error instanceof ProductError) {
      return actionError(
        error.code,
        error.message,
        error instanceof ProductError ? error.details : undefined,
      );
    }
    console.error("releaseStockAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la libération de stock");
  }
}

const ReserveStockSchema = z.object({
  variantId: z.string().uuid("ID de variante invalide"),
  warehouseId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().positive("La quantité doit être un entier positif").max(10000),
  orderId: z.string().uuid().optional(),
  reason: z.string().max(500).optional(),
});

export async function reserveStockAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = ReserveStockSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour réserver le stock");
  }

  try {
    const variant = await getVariantById(data.variantId);
    if (!variant) {
      return actionError("NOT_FOUND", "Variante introuvable");
    }

    const result = await reserveStock({
      variantId: data.variantId,
      warehouse: data.warehouseId,
      quantity: data.quantity,
      orderId: data.orderId,
      userId: user.id,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${variant.productId}`);
    revalidatePath(`/admin/products/${variant.productId}/inventory`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("STOCK_RESERVED", "Stock réservé avec succès", result);
  } catch (error) {
    if (error instanceof InventoryError || error instanceof ProductError) {
      return actionError(
        error.code,
        error.message,
        error instanceof ProductError ? error.details : undefined,
      );
    }
    console.error("reserveStockAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la réservation de stock");
  }
}

const TransferStockSchema = z.object({
  fromVariantId: z.string().uuid("ID de variante source invalide"),
  fromWarehouseId: z.string().uuid().nullable().optional(),
  toVariantId: z.string().uuid("ID de variante destination invalide"),
  toWarehouseId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().positive("La quantité doit être un entier positif").max(10000),
  reason: z.string().max(500).optional(),
});

export async function transferStockAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = TransferStockSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour transférer le stock");
  }

  try {
    const fromVariant = await getVariantById(data.fromVariantId);
    if (!fromVariant) {
      return actionError("NOT_FOUND", "Variante source introuvable");
    }

    const result = await transferStock({
      fromVariantId: data.fromVariantId,
      fromWarehouseId: data.fromWarehouseId,
      toVariantId: data.toVariantId,
      toWarehouseId: data.toWarehouseId,
      quantity: data.quantity,
      reason: data.reason ?? "Transfert entre entrepôts",
      userId: user.id,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${fromVariant.productId}`);
    revalidatePath(`/admin/products/${fromVariant.productId}/inventory`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("STOCK_TRANSFERRED", "Transfert effectué avec succès", result);
  } catch (error) {
    if (error instanceof InventoryError || error instanceof ProductError) {
      return actionError(
        error.code,
        error.message,
        error instanceof ProductError ? error.details : undefined,
      );
    }
    console.error("transferStockAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors du transfert de stock");
  }
}
