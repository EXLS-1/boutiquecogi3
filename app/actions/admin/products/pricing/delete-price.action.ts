// app/actions/admin/products/pricing/delete-price.action.ts
// SERVER ACTION - Suppression d'un prix
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

const DeletePriceSchema = z.object({
  priceId: z.string().uuid("ID de prix invalide"),
});

export async function deletePriceAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = DeletePriceSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour supprimer ce prix");
  }

  try {
    const price = await ProductService.getPriceById(data.priceId);
    if (!price) {
      return actionError("NOT_FOUND", "Prix introuvable");
    }

    const auditContext = await buildAuditContext(
      "PRODUCT_PRICE_CHANGED",
      "PRODUCT",
      price.productId
    );

    await ProductService.deletePrice(data.priceId, {
      userId: user.id,
      role: user.role,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${price.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("PRICE_DELETED", "Prix supprimé avec succès", {
      priceId: data.priceId,
      productId: price.productId,
    });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("deletePriceAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la suppression du prix");
  }
}