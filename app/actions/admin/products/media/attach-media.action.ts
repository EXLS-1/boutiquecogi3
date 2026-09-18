// app/actions/admin/products/media/attach-media.action.ts
// SERVER ACTION - Attachement de médias à un produit
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

const AttachMediaSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  urls: z.array(z.string().url("URL invalide")).min(1, "Au moins une URL est requise").max(20, "Maximum 20 images"),
  altTexts: z.array(z.string().max(200)).optional(),
});

export async function attachMediaAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = AttachMediaSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("media:upload");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour attacher des médias");
  }

  try {
    const product = await ProductService.getProductById(data.productId);
    if (!product) {
      return actionError("NOT_FOUND", "Produit introuvable");
    }

    const auditContext = await buildAuditContext(
      "PRODUCT_MEDIA_ATTACHED",
      "PRODUCT",
      data.productId
    );

    const result = await ProductService.attachMedia(data, {
      userId: user.id,
      role: user.role,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidatePath(`/admin/products/${data.productId}/media`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("MEDIA_ATTACHED", "Médias attachés avec succès", result);
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("attachMediaAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de l'attachement des médias");
  }
}