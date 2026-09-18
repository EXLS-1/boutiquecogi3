// app/actions/admin/products/tags/detach-tags.action.ts
// SERVER ACTION - Détachement de tags d'un produit
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

const DetachTagsSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  tagIds: z.array(z.string().uuid()).min(1, "Au moins un tag est requis"),
});

export async function detachTagsAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = DetachTagsSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour détacher des tags");
  }

  try {
    const product = await ProductService.getProductById(data.productId);
    if (!product) {
      return actionError("NOT_FOUND", "Produit introuvable");
    }

    const auditContext = await buildAuditContext(
      "TAGS_DETACHED",
      "PRODUCT",
      data.productId
    );

    const result = await ProductService.detachTags(data.tagIds, {
      userId: user.id,
      role: user.role,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidatePath(`/admin/products/tags`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("TAGS_DETACHED", "Tags détachés avec succès", result);
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("detachTagsAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors du détachement des tags");
  }
}