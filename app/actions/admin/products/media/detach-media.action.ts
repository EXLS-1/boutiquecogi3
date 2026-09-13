// app/actions/admin/products/media/detach-media.action.ts
// SERVER ACTION - Détachement de médias d'un produit
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

const DetachMediaSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  mediaIds: z.array(z.string().uuid()).min(1, "Au moins un média est requis"),
});

export async function detachMediaAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = DetachMediaSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("media:delete");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour détacher des médias");
  }

  try {
    const product = await ProductService.getProductById(data.productId);
    if (!product) {
      return actionError("NOT_FOUND", "Produit introuvable");
    }

    const auditContext = await buildAuditContext(
      "PRODUCT_MEDIA_DETACHED",
      "PRODUCT",
      data.productId
    );

    const result = await ProductService.detachMedia(data.mediaIds, {
      userId: user.id,
      role: user.role,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidatePath(`/admin/products/${data.productId}/media`);
    revalidateTag("admin:products:list");
    revalidateTag("admin:products:kpis");

    return actionSuccess("MEDIA_DETACHED", "Médias détachés avec succès", result);
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("detachMediaAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors du détachement des médias");
  }
}