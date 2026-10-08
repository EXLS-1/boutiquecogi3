"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { hasPermission, resolvePermissionCode } from "@/lib/auth/rbac";
import { requireAuth } from "@/lib/auth/session-provider";
import { actionError, actionSuccess } from "./_shared/action-result";
import { ProductError } from "@/lib/product/product-errors";
import {
  attachProductMedia,
  detachProductMedia,
  reorderProductMedia,
} from "@/lib/product/product-associations.service";

const AttachMediaSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  urls: z.array(z.string().url("URL invalide")).min(1, "Au moins une URL est requise").max(20, "Maximum 20 images"),
  altTexts: z.array(z.string().max(200)).optional(),
});

export async function attachMediaAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = AttachMediaSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("media:upload");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour attacher des médias");
  }

  try {
    const result = await attachProductMedia(data);

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidatePath(`/admin/products/${data.productId}/media`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("MEDIA_ATTACHED", "Médias attachés avec succès", result);
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("attachMediaAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de l'attachement des médias");
  }
}

const DetachMediaSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  mediaIds: z.array(z.string().uuid()).min(1, "Au moins un média est requis"),
});

export async function detachMediaAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = DetachMediaSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("media:delete");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour détacher des médias");
  }

  try {
    const result = await detachProductMedia(data.productId, data.mediaIds);

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidatePath(`/admin/products/${data.productId}/media`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("MEDIA_DETACHED", "Médias détachés avec succès", result);
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("detachMediaAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors du détachement des médias");
  }
}

const ReorderMediaSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  orderedMediaIds: z.array(z.string().uuid()).min(1, "Au moins un média est requis"),
});

export async function reorderMediaAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = ReorderMediaSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:update");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour réordonnancer les médias");
  }

  try {
    const result = await reorderProductMedia(data.productId, data.orderedMediaIds);

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidatePath(`/admin/products/${data.productId}/media`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("MEDIA_REORDERED", "Médias réordonnancés avec succès", result);
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("reorderMediaAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors du réordonnancement des médias");
  }
}
