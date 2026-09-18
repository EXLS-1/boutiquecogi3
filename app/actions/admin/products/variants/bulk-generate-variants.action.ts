// app/actions/admin/products/variants/bulk-generate-variants.action.ts
// SERVER ACTION - Génération en masse de variantes
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

const BulkGenerateVariantsSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  attributeKeys: z.array(z.string()).min(1, "Au moins une attribut est requis").max(5),
  attributeValues: z.record(z.string(), z.array(z.string()).min(1)).min(1),
  priceOffset: z.number().optional(),
  initialStock: z.number().min(0),
});

export async function bulkGenerateVariantsAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = BulkGenerateVariantsSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:create");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour générer des variantes");
  }

  try {
    const product = await ProductService.getProductById(data.productId);
    if (!product) {
      return actionError("NOT_FOUND", "Produit introuvable");
    }

    const auditContext = await buildAuditContext(
      "PRODUCT_VARIANT_CREATED",
      "PRODUCT",
      data.productId
    );

    const result = await ProductService.bulkGenerateVariants(data, {
      userId: user.id,
      role: user.role,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("VARIANTS_BULK_CREATED", `Variantes générées avec succès`, result);
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("bulkGenerateVariantsAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la génération des variantes");
  }
}