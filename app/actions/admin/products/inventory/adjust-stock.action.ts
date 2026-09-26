// app/actions/admin/products/inventory/adjust-stock.action.ts
// SERVER ACTION - Ajustement de stock
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { hasPermission, resolvePermissionCode } from "@/lib/auth/rbac";
import { requireAuth } from "@/lib/auth/session-provider";
import { buildAuditContext } from "../_shared/audit-context";
import { actionError, actionSuccess } from "../_shared/action-result";
import { ProductService } from "@/lib/product/product.service";
import { ProductServiceError } from "@/lib/product/product.service";

const AdjustStockSchema = z.object({
  variantId: z.string().uuid("ID de variante invalide"),
  warehouseId: z.string().uuid().nullable().optional(),
  delta: z.number().min(-10000, "Delta trop négatif").max(10000, "Delta trop positif"),
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
    const variant = await ProductService.getVariantById(data.variantId);
    if (!variant) {
      return actionError("NOT_FOUND", "Variante introuvable");
    }

    const auditContext = await buildAuditContext(
      "PRODUCT_STOCK_ADJUSTED",
      "PRODUCT",
      variant.productId
    );

    const result = await ProductService.adjustStock({
      variantId: data.variantId,
      warehouseId: data.warehouseId,
      delta: data.delta,
      reason: data.reason ?? "Ajustement manuel",
      userId: user.id,
      role: user.role,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${variant.productId}`);
    revalidatePath(`/admin/products/${variant.productId}/inventory`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("STOCK_ADJUSTED", "Stock ajusté avec succès", result);
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("adjustStockAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de l'ajustement du stock");
  }
}