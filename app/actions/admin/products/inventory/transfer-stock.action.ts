// app/actions/admin/products/inventory/transfer-stock.action.ts
// SERVER ACTION - Transfert de stock entre entrepôts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { hasPermission, resolvePermissionCode } from "@/lib/auth/rbac";
import { requireAuth } from "@/lib/auth/session-provider";
import { buildAuditContext } from "../_shared/audit-context";
import { actionError, actionSuccess } from "../_shared/action-result";
import { ProductService } from "@/lib/products/product.service";
import { ProductServiceError } from "@/lib/products/product.service";

const TransferStockSchema = z.object({
  fromVariantId: z.string().uuid("ID de variante source invalide"),
  fromWarehouseId: z.string().uuid().nullable().optional(),
  toVariantId: z.string().uuid("ID de variante destination invalide"),
  toWarehouseId: z.string().uuid().nullable().optional(),
  quantity: z.number().positive("La quantité doit être positive").max(10000),
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
    const fromVariant = await ProductService.getVariantById(data.fromVariantId);
    if (!fromVariant) {
      return actionError("NOT_FOUND", "Variante source introuvable");
    }

    const auditContext = await buildAuditContext(
      "STOCK_TRANSFERRED",
      "PRODUCT",
      fromVariant.productId
    );

    const result = await ProductService.transferStock({
      fromVariantId: data.fromVariantId,
      fromWarehouseId: data.fromWarehouseId,
      toVariantId: data.toVariantId,
      toWarehouseId: data.toWarehouseId,
      quantity: data.quantity,
      reason: data.reason ?? "Transfert entre entrepôts",
      userId: user.id,
      role: user.role,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${fromVariant.productId}`);
    revalidatePath(`/admin/products/${fromVariant.productId}/inventory`);
    revalidateTag("admin:products:list");
    revalidateTag("admin:products:kpis");

    return actionSuccess("STOCK_TRANSFERRED", "Transfert effectué avec succès", result);
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("transferStockAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors du transfert de stock");
  }
}