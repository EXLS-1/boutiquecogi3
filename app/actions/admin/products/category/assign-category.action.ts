// app/actions/admin/products/category/assign-category.action.ts
// SERVER ACTION - Assignation d'une catégorie à un produit
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

const AssignCategorySchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  categoryId: z.string().uuid("ID de catégorie invalide"),
});

export async function assignCategoryAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = AssignCategorySchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("categories:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour assigner une catégorie");
  }

  try {
    const product = await ProductService.getProductById(data.productId);
    if (!product) {
      return actionError("NOT_FOUND", "Produit introuvable");
    }

    const auditContext = await buildAuditContext(
      "CATEGORY_ASSIGNED",
      "PRODUCT",
      data.productId
    );

    await ProductService.assignCategory(data.categoryId, {
      userId: user.id,
      role: user.role,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidatePath(`/admin/products/categories`);
    revalidateTag("admin:products:list");
    revalidateTag("admin:products:kpis");

    return actionSuccess("CATEGORY_ASSIGNED", "Catégorie assignée avec succès", {
      productId: data.productId,
      categoryId: data.categoryId,
    });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("assignCategoryAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de l'assignation de la catégorie");
  }
}