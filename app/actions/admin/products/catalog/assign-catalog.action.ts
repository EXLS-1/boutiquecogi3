// app/actions/admin/products/catalog/assign-catalog.action.ts
// SERVER ACTION - Assignation d'un catalogue à un produit
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

const AssignCatalogSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  catalogId: z.string().uuid("ID de catalogue invalide"),
});

export async function assignCatalogAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = AssignCatalogSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour assigner un catalogue");
  }

  try {
    const product = await ProductService.getProductById(data.productId);
    if (!product) {
      return actionError("NOT_FOUND", "Produit introuvable");
    }

    const auditContext = await buildAuditContext(
      "CATALOG_ASSIGNED",
      "PRODUCT",
      data.productId
    );

    await ProductService.assignCatalog(data.catalogId, {
      userId: user.id,
      role: user.role,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidatePath(`/admin/products/catalogs`);
    revalidateTag("admin:products:list");
    revalidateTag("admin:products:kpis");

    return actionSuccess("CATALOG_ASSIGNED", "Catalogue assigné avec succès", {
      productId: data.productId,
      catalogId: data.catalogId,
    });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("assignCatalogAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de l'assignation du catalogue");
  }
}