// app/actions/admin/products/update-product.action.ts
// ═════════════════════════════════════════════════════════════════════════════
// SERVER ACTION — Mise à jour de produit
// ═════════════════════════════════════════════════════════════════════════════
// Pattern strict : UI → Server Action → Service → Policy → RBAC → Prisma

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { hasPermission, resolvePermissionCode } from "@/lib/auth/rbac";
import { requireAuth } from "@/lib/auth/session-provider";
import { buildAuditContext } from "./_shared/audit-context";
import { actionError, actionSuccess } from "./_shared/action-result";
import { ProductService } from "@/lib/products/product.service";
import { ProductServiceError } from "@/lib/products/product.service";
import {
  CreateProductSchema,
  type ActionResult,
} from "./_shared/parse-input";

// ───────────────────────────────────────────
// SCHEMA DE VALIDATION — Mise à jour
// ───────────────────────────────────────────

const UpdateProductSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  name: z.string().min(2, "Le nom est trop court").max(200, "Le nom est trop long").optional(),
  description: z.string().max(5000, "La description est trop longue").optional().nullable(),
  sku: z.string().min(3, "Le SKU est trop court").max(64, "Le SKU est trop long").optional(),
  categoryIds: z.array(z.string().uuid()).max(10, "Maximum 10 catégories").optional(),
  basePrice: z.number().positive("Le prix de base doit être positif").optional(),
  salePrice: z.number().positive("Le prix de vente doit être positif").optional(),
  saleStart: z.date().optional(),
  saleEnd: z.date().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  seoTitle: z.string().max(70, "Titre SEO trop long").optional().nullable(),
  seoDescription: z.string().max(160, "Description SEO trop longue").optional().nullable(),
  videoUrl: z.string().url("URL vidéo invalide").optional().nullable(),
  tagIds: z.array(z.string().uuid()).max(50, "Maximum 50 tags").optional(),
}).strict();

// ───────────────────────────────────────────
// ACTION
// ───────────────────────────────────────────

export async function updateProductAction(input: unknown): Promise<ActionResult> {
  // 1. Authentification
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  // 2. Validation Zod
  const parsed = UpdateProductSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  // 3. Vérification RBAC — permission canonique
  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour modifier ce produit");
  }

  // 4. Contexte d'audit
  const auditContext = await buildAuditContext(
    "PRODUCT_UPDATED",
    "PRODUCT",
    data.productId
  );

  try {
    // 5. Mise à jour via service (orchestration complète)
    await ProductService.update(
      data.productId,
      {
        name: data.name,
        description: data.description,
        sku: data.sku,
        categoryIds: data.categoryIds,
        basePrice: data.basePrice,
        salePrice: data.salePrice,
        saleStart: data.saleStart,
        saleEnd: data.saleEnd,
        isFeatured: data.isFeatured,
        isActive: data.isActive,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        videoUrl: data.videoUrl,
        tagIds: data.tagIds,
      },
      {
        userId: user.id,
        role: user.role,
      },
      auditContext
    );

    // 6. Revalidation du cache
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("PRODUCT_UPDATED", "Produit mis à jour avec succès", {
      productId: data.productId,
    });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("updateProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la mise à jour du produit");
  }
}