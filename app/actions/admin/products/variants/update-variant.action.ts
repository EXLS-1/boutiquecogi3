// app/actions/admin/products/variants/update-variant.action.ts
// SERVER ACTION - Mise à jour d'une variante
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

const UpdateVariantSchema = z.object({
  variantId: z.string().uuid("ID de variante invalide"),
  sku: z.string().min(3, "Le SKU est trop court").max(64, "Le SKU est trop long").optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  priceOffset: z.number().optional(),
  isActive: z.boolean().optional(),
});

export async function updateVariantAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = UpdateVariantSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour modifier cette variante");
  }

  try {
    const variant = await ProductService.getVariantById(data.variantId);
    if (!variant) {
      return actionError("NOT_FOUND", "Variante introuvable");
    }

    const auditContext = await buildAuditContext(
      "PRODUCT_VARIANT_UPDATED",
      "PRODUCT",
      variant.productId
    );

    await ProductService.updateVariant(data.variantId, data, {
      userId: user.id,
      role: user.role,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${variant.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("VARIANT_UPDATED", "Variante mise à jour avec succès", {
      variantId: data.variantId,
      productId: variant.productId,
    });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("updateVariantAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la mise à jour de la variante");
  }
}