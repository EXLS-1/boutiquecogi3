// app/actions/admin/products/restore-product.action.ts
// ═════════════════════════════════════════════════════════════════════════════
// SERVER ACTION — Restauration de produit (soft-deleted → DRAFT)
// ═════════════════════════════════════════════════════════════════════════════

"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { hasPermission, resolvePermissionCode } from "@/lib/auth/rbac";
import { requireAuth } from "@/lib/auth/session-provider";
import { buildAuditContext } from "./_shared/audit-context";
import { actionError, actionSuccess } from "./_shared/action-result";
import { ProductService } from "@/lib/product/product.service";
import { ProductServiceError } from "@/lib/product/product.service";

const RestoreSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
});

export async function restoreProductAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = RestoreSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  // Permission canonique (products:delete = soft-delete/restore)
  const requiredPermission = resolvePermissionCode("products:delete");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour restaurer ce produit");
  }

  const auditContext = await buildAuditContext(
    "PRODUCT_RESTORED",
    "PRODUCT",
    data.productId
  );

  try {
    await ProductService.restore(data.productId, {
      userId: user.id,
      role: user.role,
    }, auditContext);

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("PRODUCT_RESTORED", "Produit restauré avec succès", {
      productId: data.productId,
    });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("restoreProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la restauration du produit");
  }
}