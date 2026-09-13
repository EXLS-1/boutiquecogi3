// app/actions/admin/products/pricing/create-price.action.ts
// SERVER ACTION - Création d'un prix pour un produit
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

const CreatePriceSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  currency: z.enum(["USD", "CDF"], "Devise invalide"),
  amount: z.number().positive("Le montant doit être positif").max(1_000_000_000),
  compareAtPrice: z.number().optional(),
  country: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  startsAt: z.date().nullable().optional(),
  endsAt: z.date().nullable().optional(),
});

export async function createPriceAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = CreatePriceSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour créer un prix");
  }

  const auditContext = await buildAuditContext(
    "PRODUCT_PRICE_CHANGED",
    "PRODUCT",
    data.productId
  );

  try {
    await ProductService.createPrice(data, {
      userId: user.id,
      role: user.role,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list");
    revalidateTag("admin:products:kpis");

    return actionSuccess("PRICE_CREATED", "Prix créé avec succès", {
      productId: data.productId,
      currency: data.currency,
      amount: data.amount,
    });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("createPriceAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la création du prix");
  }
}