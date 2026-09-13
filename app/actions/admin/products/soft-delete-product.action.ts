// app/actions/admin/products/soft-delete-product.action.ts
// ═════════════════════════════════════════════════════════════════════════════
// SERVER ACTION — Soft-delete de produit
// ═════════════════════════════════════════════════════════════════════════════

"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { hasPermission, resolvePermissionCode } from "@/lib/auth/rbac";
import { requireAuth } from "@/lib/auth/session-provider";
import { buildAuditContext } from "./_shared/audit-context";
import { actionError, actionSuccess } from "./_shared/action-result";
import { ProductService } from "@/lib/products/product.service";
import { ProductServiceError } from "@/lib/products/product.service";

const SoftDeleteSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  reason: z.string().max(500).optional(),
});

export async function softDeleteProductAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = SoftDeleteSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  // Permission canonique (products:delete = soft-delete)
  const requiredPermission = resolvePermissionCode("products:delete");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour supprimer ce produit");
  }

  const auditContext = await buildAuditContext(
    "PRODUCT_DELETED",
    "PRODUCT",
    data.productId
  );

  try {
    await ProductService.delete(data.productId, {
      userId: user.id,
      role: user.role,
      reason: data.reason,
    }, auditContext);

    revalidatePath("/admin/products");
    revalidateTag("admin:products:list");
    revalidateTag("admin:products:kpis");

    return actionSuccess("PRODUCT_DELETED", "Produit supprimé avec succès", {
      productId: data.productId,
    });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("softDeleteProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la suppression du produit");
  }
}