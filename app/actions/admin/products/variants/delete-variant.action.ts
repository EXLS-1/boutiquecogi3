// app/actions/admin/products/variants/delete-variant.action.ts
// SERVER ACTION - Suppression d'une variante
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

const DeleteVariantSchema = z.object({
  variantId: z.string().uuid("ID de variante invalide"),
  reason: z.string().max(500).optional(),
});

export async function deleteVariantAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = DeleteVariantSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:delete");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour supprimer cette variante");
  }

  try {
    const variant = await ProductService.getVariantById(data.variantId);
    if (!variant) {
      return actionError("NOT_FOUND", "Variante introuvable");
    }

    const auditContext = await buildAuditContext(
      "PRODUCT_VARIANT_DELETED",
      "PRODUCT",
      variant.productId
    );

    await ProductService.deleteVariant(data.variantId, {
      userId: user.id,
      role: user.role,
      reason: data.reason,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${variant.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("VARIANT_DELETED", "Variante supprimée avec succès", {
      variantId: data.variantId,
      productId: variant.productId,
    });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("deleteVariantAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la suppression de la variante");
  }
}