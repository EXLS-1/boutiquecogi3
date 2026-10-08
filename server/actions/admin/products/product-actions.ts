"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { hasPermission, resolvePermissionCode } from "@/lib/auth/rbac";
import { requireAuth } from "@/lib/auth/session-provider";
import { actionError, actionSuccess } from "./_shared/action-result";
import type { ActionResult } from "./_shared/action-result";
import { ProductService } from "@/lib/product/product-service";
import { ProductError } from "@/lib/product/product-errors";
import {
  restoreProduct,
  updateProduct,
} from "@/lib/product/product-service-helpers";

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
  try {
    const result = await ProductService.create(
      {
        ...data,
        variants: data.variants?.map((variant) => ({
          ...variant,
          attributes: variant.attributes ?? {},
        })),
      },
      user.id,
    );

    // 6. Revalidation du cache
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${result.productId}`);

    return actionSuccess("PRODUCT_CREATED", "Produit créé avec succès", {
      productId: result.productId,
      slug: result.slug,
      variantCount: data.variants?.length ?? 0,
      totalStock: result.totalStock,
    });
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("createProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la création du produit");
  }
}

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
  try {
    await updateProduct(
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
      { userId: user.id },
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
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("updateProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la mise à jour du produit");
  }
}

const SoftDeleteSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  reason: z.string().max(500).optional(),
});

export async function softDeleteProductAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = SoftDeleteSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  // Permission canonique (products:delete = soft-delete)
  const requiredPermission = resolvePermissionCode("products:delete");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour supprimer ce produit");
  }

  try {
    await ProductService.softDelete(data.productId, user.id, data.reason);

    revalidatePath("/admin/products");
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("PRODUCT_DELETED", "Produit supprimé avec succès", {
      productId: data.productId,
    });
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("softDeleteProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la suppression du produit");
  }
}

const RestoreSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
});

export async function restoreProductAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = RestoreSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  // Permission canonique (products:delete = soft-delete/restore)
  const requiredPermission = resolvePermissionCode("products:delete");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour restaurer ce produit");
  }

  try {
    await restoreProduct(data.productId, { userId: user.id });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("PRODUCT_RESTORED", "Produit restauré avec succès", {
      productId: data.productId,
    });
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("restoreProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la restauration du produit");
  }
}
