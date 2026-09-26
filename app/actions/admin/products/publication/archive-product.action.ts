// app/actions/admin/products/publication/archive-product.action.ts
// SERVER ACTION - Archivage (PUBLISHED -> ARCHIVED)
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

const ArchiveSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  reason: z.string().max(500).optional(),
});

export async function archiveProductAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = ArchiveSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:moderate");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour archiver ce produit");
  }

  const auditContext = await buildAuditContext(
    "PRODUCT_STATUS_CHANGED",
    "PRODUCT",
    data.productId
  );

  try {
    await ProductService.archive(data.productId, {
      userId: user.id,
      role: user.role,
      reason: data.reason,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("PRODUCT_ARCHIVED", "Produit archivé avec succès", {
      productId: data.productId,
      status: "ARCHIVED",
    });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("archiveProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de l'archivage du produit");
  }
}