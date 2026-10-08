"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { hasPermission, resolvePermissionCode } from "@/lib/auth/rbac";
import { requireAuth } from "@/lib/auth/session-provider";
import { actionError, actionSuccess } from "./_shared/action-result";
import { ProductError } from "@/lib/product/product-errors";
import { assignCatalogToProduct } from "@/lib/product/catalog/catalog.service";
import { removeCatalogFromProduct } from "@/lib/product/catalog/catalog.service";
import { assertCatalogIsActive } from "@/lib/product/catalog/catalog.service";
import { setCatalogOverride, PricingError } from "@/lib/product/pricing/price.service";
import { getProductById } from "@/lib/product/product-service-helpers";

const AssignCatalogSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  catalogId: z.string().uuid("ID de catalogue invalide"),
});

export async function assignCatalogAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = AssignCatalogSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour assigner un catalogue");
  }

  try {
    await assignCatalogToProduct(data.productId, data.catalogId);

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidatePath(`/admin/products/catalogs`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("CATALOG_ASSIGNED", "Catalogue assigné avec succès", {
      productId: data.productId,
      catalogId: data.catalogId,
    });
  } catch (error) {
    if (error instanceof ProductError) {
      const details =
        error.details && typeof error.details === "object" && !Array.isArray(error.details)
          ? { ...error.details }
          : undefined;
      return actionError(error.code, error.message, details);
    }
    console.error("assignCatalogAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de l'assignation du catalogue");
  }
}

const RemoveCatalogSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  catalogId: z.string().uuid("ID de catalogue invalide"),
});

export async function removeCatalogAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = RemoveCatalogSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour retirer un catalogue");
  }

  try {
    await removeCatalogFromProduct(data.productId, data.catalogId);

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidatePath(`/admin/products/catalogs`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("CATALOG_REMOVED", "Catalogue retiré avec succès", {
      productId: data.productId,
      catalogId: data.catalogId,
    });
  } catch (error) {
    if (error instanceof ProductError) {
      const details =
        error.details && typeof error.details === "object" && !Array.isArray(error.details)
          ? { ...error.details }
          : undefined;
      return actionError(error.code, error.message, details);
    }
    console.error("removeCatalogAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors du retrait du catalogue");
  }
}

const SetCatalogPriceOverrideSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  catalogId: z.string().uuid("ID de catalogue invalide"),
  priceOverride: z
    .number()
    .positive("Le prix de surcharge doit être positif")
    .max(99_999_999.99, "Le prix de surcharge dépasse la limite autorisée")
    .refine(
      (price) => Math.round(price * 100) / 100 === price,
      "Le prix de surcharge ne peut pas dépasser deux décimales",
    )
    .nullable(),
});

export async function setCatalogPriceOverrideAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = SetCatalogPriceOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour modifier le prix de surcharge");
  }

  try {
    const product = await getProductById(data.productId);
    if (!product) {
      return actionError("NOT_FOUND", "Produit introuvable");
    }
    if (product.isdeleted) {
      return actionError("NOT_FOUND", "Produit introuvable");
    }

    await assertCatalogIsActive(data.catalogId);

    const priceOverrideCents =
      data.priceOverride === null ? null : Math.round(data.priceOverride * 100);
    await setCatalogOverride(data.catalogId, data.productId, priceOverrideCents);

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidatePath(`/admin/products/${data.productId}/pricing`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("CATALOG_PRICE_OVERRIDE_SET", "Prix de surcharge défini avec succès", {
      productId: data.productId,
      catalogId: data.catalogId,
      priceOverride: data.priceOverride,
    });
  } catch (error) {
    if (error instanceof ProductError || error instanceof PricingError) {
      const details =
        error.details && typeof error.details === "object" && !Array.isArray(error.details)
          ? { ...error.details }
          : undefined;
      return actionError(error.code, error.message, details);
    }
    console.error("setCatalogPriceOverrideAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la définition du prix de surcharge");
  }
}
