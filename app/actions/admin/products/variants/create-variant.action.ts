// app/actions/admin/products/variants/create-variant.action.ts
// SERVER ACTION - Création d'une variante
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

const CreateVariantSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  sku: z.string().min(3, "Le SKU est trop court").max(64, "Le SKU est trop long").optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  priceOffset: z.number().optional(),
  initialStock: z.number().min(0, "Le stock initial ne peut pas être négatif"),
});

export async function createVariantAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = CreateVariantSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:create");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour créer une variante");
  }

  const auditContext = await buildAuditContext(
    "PRODUCT_VARIANT_CREATED",
    "PRODUCT",
    data.productId
  );

  try {
    const result = await ProductService.createVariant(data, {
      userId: user.id,
      role: user.role,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("VARIANT_CREATED", "Variante créée avec succès", result);
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("createVariantAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la création de la variante");
  }
}