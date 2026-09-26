// app/actions/admin/products/inventory/release-stock.action.ts
// SERVER ACTION - Libération de stock réservé
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

const ReleaseStockSchema = z.object({
  variantId: z.string().uuid("ID de variante invalide"),
  warehouseId: z.string().uuid().nullable().optional(),
  quantity: z.number().positive("La quantité doit être positive").max(10000),
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
    const variant = await ProductService.getVariantById(data.variantId);
    if (!variant) {
      return actionError("NOT_FOUND", "Variante introuvable");
    }

    const auditContext = await buildAuditContext(
      "STOCK_RELEASED",
      "PRODUCT",
      variant.productId
    );

    const result = await ProductService.releaseStock({
      variantId: data.variantId,
      warehouseId: data.warehouseId,
      quantity: data.quantity,
      orderId: data.orderId,
      reason: data.reason ?? "Libération de stock",
      userId: user.id,
      role: user.role,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${variant.productId}`);
    revalidatePath(`/admin/products/${variant.productId}/inventory`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("STOCK_RELEASED", "Stock libéré avec succès", result);
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("releaseStockAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la libération de stock");
  }
}