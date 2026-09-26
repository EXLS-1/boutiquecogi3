// app/actions/admin/products/catalog/set-catalog-price-override.action.ts
// SERVER ACTION - Définition d'un prix de surcharge catalogue
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

const SetCatalogPriceOverrideSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  catalogId: z.string().uuid("ID de catalogue invalide"),
  priceOverride: z.number().positive("Le prix de surcharge doit être positif").nullable(),
});

export async function setCatalogPriceOverrideAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = SetCatalogPriceOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour modifier le prix de surcharge");
  }

  try {
    const product = await ProductService.getProductById(data.productId);
    if (!product) {
      return actionError("NOT_FOUND", "Produit introuvable");
    }

    const auditContext = await buildAuditContext(
      "PRODUCT_PRICE_CHANGED",
      "PRODUCT",
      data.productId
    );

    await ProductService.setCatalogPriceOverride(data.catalogId, data.priceOverride, {
      userId: user.id,
      role: user.role,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidatePath(`/admin/products/${data.productId}/pricing`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("CATALOG_PRICE_OVERRIDE_SET", "Prix de surcharge défini avec succès", {
      productId: data.productId,
      catalogId: data.catalogId,
      priceOverride: data.priceOverride,
    });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("setCatalogPriceOverrideAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la définition du prix de surcharge");
  }
}