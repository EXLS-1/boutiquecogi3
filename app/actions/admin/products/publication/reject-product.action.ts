// app/actions/admin/products/publication/reject-product.action.ts
// SERVER ACTION - Rejection (PENDING -> DRAFT)
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

const RejectSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  reason: z.string().max(500, "La raison est trop longue").optional(),
});

export async function rejectProductAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = RejectSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:moderate");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour rejeter ce produit");
  }

  const auditContext = await buildAuditContext(
    "PRODUCT_STATUS_CHANGED",
    "PRODUCT",
    data.productId
  );

  try {
    await ProductService.rejectForReview(data.productId, {
      userId: user.id,
      role: user.role,
      reason: data.reason ?? "Rejeté par l'administrateur",
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("PRODUCT_REJECTED", "Produit rejeté et retourné en brouillon", {
      productId: data.productId,
      status: "DRAFT",
    });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("rejectProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors du rejet du produit");
  }
}