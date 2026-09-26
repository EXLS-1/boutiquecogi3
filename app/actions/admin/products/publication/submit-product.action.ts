// app/actions/admin/products/publication/submit-product.action.ts
// ═════════════════════════════════════════════════════════════════════════════
// SERVER ACTION — Soumission pour approbation (DRAFT → PENDING)
// ═════════════════════════════════════════════════════════════════════════════

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

const SubmitSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  reason: z.string().max(500).optional(),
});

export async function submitProductAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = SubmitSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  // Permission pour soumettre un produit (products:moderate = approval workflow)
  const requiredPermission = resolvePermissionCode("products:moderate");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour soumettre ce produit");
  }

  const auditContext = await buildAuditContext(
    "PRODUCT_STATUS_CHANGED",
    "PRODUCT",
    data.productId
  );

  try {
    await ProductService.submitForReview(data.productId, {
      userId: user.id,
      role: user.role,
      reason: data.reason,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("PRODUCT_SUBMITTED", "Produit soumis pour approbation", {
      productId: data.productId,
      status: "PENDING",
    });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("submitProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la soumission du produit");
  }
}