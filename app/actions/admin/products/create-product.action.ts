// app/actions/admin/products/create-product.action.ts
// ═════════════════════════════════════════════════════════════════════════════
// SERVER ACTION — Création de produit
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
import { ProductService } from "@/lib/product/product.service";
import { CreateProductSchema } from "./_shared/parse-input";

// ───────────────────────────────────────────
// SCHEMA DE VALIDATION
// ───────────────────────────────────────────

const CreateProductInputSchema = z.object({
  name: z.string().min(2, "Le nom est trop court").max(200, "Le nom est trop long"),
  description: z.string().max(5000, "La description est trop longue").optional(),
  slug: z.string().min(2, "Le slug est trop court").max(64, "Le slug est trop long").optional(),
  sku: z.string().min(3, "Le SKU est trop court").max(64, "Le SKU est trop long").optional(),
  productTypeId: z.string().uuid("ID de type invalide").optional(),
  categoryIds: z.array(z.string().uuid()).max(10, "Maximum 10 catégories").optional(),
  basePrice: z.number().positive("Le prix de base doit être positif"),
  currency: z.enum(["USD", "CDF"]).optional(),
  compareAtPrice: z.number().optional(),
  variants: z.array(z.object({
    sku: z.string().optional(),
    attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    priceOffset: z.number().optional(),
    initialStock: z.number().min(0, "Le stock initial ne peut pas être négatif"),
  })).optional(),
  images: z.array(z.string().url("URL d'image invalide")).max(20, "Maximum 20 images").optional(),
  prices: z.array(z.object({
    currency: z.enum(["USD", "CDF"]),
    amount: z.number().positive("Le montant doit être positif"),
    compareAtPrice: z.number().optional(),
    country: z.string().nullable().optional(),
    region: z.string().nullable().optional(),
    startsAt: z.date().optional(),
    endsAt: z.date().optional(),
  })).optional(),
  tagIds: z.array(z.string().uuid()).max(50, "Maximum 50 tags").optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  seoTitle: z.string().max(70, "Titre SEO trop long").optional(),
  seoDescription: z.string().max(160, "Description SEO trop longue").optional(),
}).strict();

// ───────────────────────────────────────────
// ACTION
// ───────────────────────────────────────────

export async function createProductAction(input: unknown) {
  // 1. Authentification
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  // 2. Validation Zod
  const parsed = CreateProductInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  // 3. Vérification RBAC — permission canonique (résolution des aliases)
  const requiredPermission = resolvePermissionCode("products:create");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour créer un produit");
  }

  // 4. Contexte d'audit
  const auditContext = await buildAuditContext();

  try {
    // 5. Création du produit via service (orchestration complète)
    const result = await ProductService.create({
      name: data.name,
      description: data.description,
      slug: data.slug,
      sku: data.sku,
      productTypeId: data.productTypeId,
      categoryIds: data.categoryIds,
      basePrice: data.basePrice,
      currency: data.currency,
      compareAtPrice: data.compareAtPrice,
      variants: data.variants,
      images: data.images,
      prices: data.prices,
      tagIds: data.tagIds,
      isFeatured: data.isFeatured,
      isActive: data.isActive,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      actor: {
        userId: user.id,
        role: user.role,
      },
      context: auditContext,
    });

    // 6. Revalidation du cache
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${result.productId}`);

    return actionSuccess("PRODUCT_CREATED", "Produit créé avec succès", {
      productId: result.productId,
      slug: result.slug,
      variantCount: result.variantCount,
      totalStock: result.totalStock,
    });
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("createProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la création du produit");
  }
}

// ───────────────────────────────────────────
// IMPORT TYPES
// ───────────────────────────────────────────

import { ProductServiceError } from "@/lib/product/product.service";
