"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { hasPermission, resolvePermissionCode } from "@/lib/auth/rbac";
import { requireAuth } from "@/lib/auth/session-provider";
import { actionError, actionSuccess } from "./_shared/action-result";
import { ProductError } from "@/lib/product/product-errors";
import { getVariantById } from "@/lib/product/product-service-helpers";
import {
  bulkGenerateVariants,
  createVariant,
  deleteVariant,
  updateVariant,
} from "@/lib/product/variant/variant.service";
import { PRODUCT_LIMITS } from "@/lib/product/product-constant";

const MAX_BULK_VARIANTS = PRODUCT_LIMITS.VARIANT_MAX;

const BulkGenerateVariantsSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  attributeKeys: z.array(z.string().min(1)).min(1, "Au moins un attribut est requis").max(5)
    .refine((keys) => new Set(keys).size === keys.length, "Les attributs ne peuvent pas être répétés"),
  attributeValues: z.record(z.string(), z.array(z.string().min(1)).min(1))
    .refine((values) => Object.keys(values).length > 0, "Au moins une valeur d'attribut est requise"),
  priceOffset: z.number().finite().optional(),
  initialStock: z.number().int().min(0),
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
    let combinations: Array<Record<string, string>> = [{}];
    for (const key of data.attributeKeys) {
      const values = data.attributeValues[key];
      if (!values) {
        return actionError("VALIDATION_ERROR", `Aucune valeur n'est définie pour ${key}`);
      }
      if (combinations.length * values.length > MAX_BULK_VARIANTS) {
        return actionError("VALIDATION_ERROR", `La génération dépasse la limite de ${MAX_BULK_VARIANTS} variantes`);
      }
      combinations = combinations.flatMap((combination) =>
        values.map((value) => ({ ...combination, [key]: value })),
      );
    }

    const result = await bulkGenerateVariants({
      productId: data.productId,
      variants: combinations.map((attributes) => ({
        attributes,
        priceOffset: data.priceOffset,
        initialStock: data.initialStock,
      })),
    }, user.id);

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("VARIANTS_BULK_CREATED", `Variantes générées avec succès`, result);
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("bulkGenerateVariantsAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la génération des variantes");
  }
}

const CreateVariantSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  sku: z.string().min(3, "Le SKU est trop court").max(64, "Le SKU est trop long").optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  priceOffset: z.number().finite().optional(),
  initialStock: z.number().int().min(0, "Le stock initial ne peut pas être négatif"),
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

  try {
    const result = await createVariant(data, user.id);

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("VARIANT_CREATED", "Variante créée avec succès", result);
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("createVariantAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la création de la variante");
  }
}

const DeleteVariantSchema = z.object({
  variantId: z.string().uuid("ID de variante invalide"),
  reason: z.string().max(500).optional(),
});

export async function deleteVariantAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = DeleteVariantSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:delete");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour supprimer cette variante");
  }

  try {
    const variant = await getVariantById(data.variantId);
    if (!variant) {
      return actionError("NOT_FOUND", "Variante introuvable");
    }

    await deleteVariant(data.variantId, data.reason);

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${variant.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("VARIANT_DELETED", "Variante supprimée avec succès", {
      variantId: data.variantId,
      productId: variant.productId,
    });
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("deleteVariantAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la suppression de la variante");
  }
}

const UpdateVariantSchema = z.object({
  variantId: z.string().uuid("ID de variante invalide"),
  sku: z.string().min(3, "Le SKU est trop court").max(64, "Le SKU est trop long").optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  priceOffset: z.number().optional(),
  isActive: z.boolean().optional(),
}).refine(
  ({ sku, attributes, priceOffset, isActive }) =>
    sku !== undefined ||
    attributes !== undefined ||
    priceOffset !== undefined ||
    isActive !== undefined,
  "Au moins un champ doit être modifié",
);

export async function updateVariantAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = UpdateVariantSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour modifier cette variante");
  }

  try {
    const variant = await getVariantById(data.variantId);
    if (!variant) {
      return actionError("NOT_FOUND", "Variante introuvable");
    }

    await updateVariant(data.variantId, {
      sku: data.sku,
      attributes: data.attributes,
      priceOffset: data.priceOffset,
      isActive: data.isActive,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${variant.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("VARIANT_UPDATED", "Variante mise à jour avec succès", {
      variantId: data.variantId,
      productId: variant.productId,
    });
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("updateVariantAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la mise à jour de la variante");
  }
}
