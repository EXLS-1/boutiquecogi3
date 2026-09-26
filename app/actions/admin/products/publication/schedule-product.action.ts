// app/actions/admin/products/publication/schedule-product.action.ts
// SERVER ACTION - Programmation de publication (DRAFT -> SCHEDULED)
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

const ScheduleSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  scheduledAt: z.date("Date de programmation invalide").min(new Date(), "La date doit être dans le futur"),
  reason: z.string().max(500).optional(),
});

export async function scheduleProductAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = ScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:moderate");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour programmer ce produit");
  }

  const auditContext = await buildAuditContext(
    "PRODUCT_STATUS_CHANGED",
    "PRODUCT",
    data.productId
  );

  try {
    await ProductService.schedule(data.productId, data.scheduledAt, {
      userId: user.id,
      role: user.role,
      reason: data.reason,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("PRODUCT_SCHEDULED", "Produit programmé pour publication", {
      productId: data.productId,
      status: "SCHEDULED",
      scheduledAt: data.scheduledAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("scheduleProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la programmation du produit");
  }
}