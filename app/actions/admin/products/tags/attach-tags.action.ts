// app/actions/admin/products/tags/attach-tags.action.ts
// SERVER ACTION - Attachement de tags à un produit
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

const AttachTagsSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  tagIds: z.array(z.string().uuid()).min(1, "Au moins un tag est requis").max(50, "Maximum 50 tags"),
});

export async function attachTagsAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = AttachTagsSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour attacher des tags");
  }

  try {
    const product = await ProductService.getProductById(data.productId);
    if (!product) {
      return actionError("NOT_FOUND", "Produit introuvable");
    }

    const auditContext = await buildAuditContext(
      "TAGS_ATTACHED",
      "PRODUCT",
      data.productId
    );

    const result = await ProductService.attachTags(data.tagIds, {
      userId: user.id,
      role: user.role,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidatePath(`/admin/products/tags`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("TAGS_ATTACHED", "Tags attachés avec succès", result);
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("attachTagsAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de l'attachement des tags");
  }
}