// app/actions/admin/products/pricing/update-price.action.ts
// SERVER ACTION - Mise à jour d'un prix
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

const UpdatePriceSchema = z.object({
  priceId: z.string().uuid("ID de prix invalide"),
  amount: z.number().positive("Le montant doit être positif").max(1_000_000_000).optional(),
  compareAtPrice: z.number().optional(),
  country: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  startsAt: z.date().nullable().optional(),
  endsAt: z.date().nullable().optional(),
});

export async function updatePriceAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = UpdatePriceSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour modifier ce prix");
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

    await ProductService.updatePrice(data.priceId, data, {
      userId: user.id,
      role: user.role,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${price.productId}`);
    revalidateTag("admin:products:list");
    revalidateTag("admin:products:kpis");

    return actionSuccess("PRICE_UPDATED", "Prix mis à jour avec succès", {
      priceId: data.priceId,
      productId: price.productId,
    });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("updatePriceAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la mise à jour du prix");
  }
}