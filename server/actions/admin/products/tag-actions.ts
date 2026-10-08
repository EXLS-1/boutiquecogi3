"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { hasPermission, resolvePermissionCode } from "@/lib/auth/rbac";
import { requireAuth } from "@/lib/auth/session-provider";
import { actionError, actionSuccess } from "./_shared/action-result";
import { ProductError } from "@/lib/product/product-errors";
import {
  attachProductTags,
  detachProductTags,
} from "@/lib/product/product-associations.service";

const AttachTagsSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  tagIds: z.array(z.string().uuid()).min(1, "Au moins un tag est requis").max(50, "Maximum 50 tags"),
});

export async function attachTagsAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = AttachTagsSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour attacher des tags");
  }

  try {
    const result = await attachProductTags(data.productId, data.tagIds);

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidatePath(`/admin/products/tags`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("TAGS_ATTACHED", "Tags attachés avec succès", result);
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("attachTagsAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de l'attachement des tags");
  }
}

const DetachTagsSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  tagIds: z.array(z.string().uuid()).min(1, "Au moins un tag est requis"),
});

export async function detachTagsAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = DetachTagsSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour détacher des tags");
  }

  try {
    const result = await detachProductTags(data.productId, data.tagIds);

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidatePath(`/admin/products/tags`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("TAGS_DETACHED", "Tags détachés avec succès", result);
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("detachTagsAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors du détachement des tags");
  }
}
