"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { hasPermission, resolvePermissionCode } from "@/lib/auth/rbac";
import { requireAuth } from "@/lib/auth/session-provider";
import { actionError, actionSuccess } from "./_shared/action-result";
import { ProductService } from "@/lib/product/product-service";
import { ProductError } from "@/lib/product/product-errors";
import { ProductStatus } from "@prisma/client";
import { discontinueProduct } from "@/lib/product/product-service-publish";

const ApproveSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  reason: z.string().max(500, "La raison est trop longue").optional(),
});

export async function approveProductAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  // 3. Validation Zod
  const parsed = ApproveSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  // 4. Vérification de permission (products:moderate pour approbation)
  const requiredPermission = resolvePermissionCode("products:moderate");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour approuver ce produit");
  }

  try {
    await ProductService.publish(data.productId, user.id, data.reason);

    // 7. Revalidation du cache (updateTag pour expiration immédiate)
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("PRODUCT_APPROVED", "Produit approuvé et publié");
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message);
    }
    console.error("approveProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de l'approbation du produit");
  }
}

const ArchiveSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  reason: z.string().max(500).optional(),
});

export async function archiveProductAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = ArchiveSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:moderate");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour archiver ce produit");
  }

  try {
    await ProductService.setStatus(
      data.productId,
      ProductStatus.ARCHIVED,
      user.id,
      data.reason,
    );

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("PRODUCT_ARCHIVED", "Produit archivé avec succès", {
      productId: data.productId,
      status: "ARCHIVED",
    });
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("archiveProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de l'archivage du produit");
  }
}

const DiscontinueSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  reason: z.string().max(500, "La raison est trop longue").optional(),
});

export async function discontinueProductAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = DiscontinueSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:moderate");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour arrêter ce produit");
  }

  try {
    await discontinueProduct(
      data.productId,
      { userId: user.id },
      data.reason ?? "Arrêt commercial",
    );

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("PRODUCT_DISCONTINUED", "Produit arrêté avec succès", {
      productId: data.productId,
      status: "DISCONTINUED",
    });
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("discontinueProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de l'arrêt du produit");
  }
}

const PublishSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  reason: z.string().max(500).optional(),
});

export async function publishProductAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = PublishSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:moderate");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour publier ce produit");
  }

  try {
    await ProductService.publish(data.productId, user.id, data.reason);

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("PRODUCT_PUBLISHED", "Produit publié avec succès", {
      productId: data.productId,
      status: "PUBLISHED",
    });
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("publishProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la publication du produit");
  }
}

const RejectSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  reason: z.string().max(500, "La raison est trop longue").optional(),
});

export async function rejectProductAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = RejectSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:moderate");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour rejeter ce produit");
  }

  try {
    await ProductService.setStatus(
      data.productId,
      ProductStatus.DRAFT,
      user.id,
      data.reason ?? "Rejeté par l'administrateur",
    );

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("PRODUCT_REJECTED", "Produit rejeté et retourné en brouillon", {
      productId: data.productId,
      status: "DRAFT",
    });
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("rejectProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors du rejet du produit");
  }
}

const ScheduleSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  scheduledAt: z.date("Date de programmation invalide"),
  reason: z.string().max(500).optional(),
});

export async function scheduleProductAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = ScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const requiredPermission = resolvePermissionCode("products:moderate");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour programmer ce produit");
  }

  try {
    await ProductService.setStatus(
      data.productId,
      ProductStatus.SCHEDULED,
      user.id,
      data.reason,
      data.scheduledAt,
    );

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("PRODUCT_SCHEDULED", "Produit programmé pour publication", {
      productId: data.productId,
      status: "SCHEDULED",
      scheduledAt: data.scheduledAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("scheduleProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la programmation du produit");
  }
}

const SubmitSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  reason: z.string().max(500).optional(),
});

export async function submitProductAction(input: unknown) {
  const user = await requireAuth();
  if (!user) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  const parsed = SubmitSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Données invalides", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  // Permission pour soumettre un produit (products:moderate = approval workflow)
  const requiredPermission = resolvePermissionCode("products:moderate");
  const hasAccess = await hasPermission(user.role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour soumettre ce produit");
  }

  try {
    await ProductService.setStatus(
      data.productId,
      ProductStatus.PENDING,
      user.id,
      data.reason,
    );

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("PRODUCT_SUBMITTED", "Produit soumis pour approbation", {
      productId: data.productId,
      status: "PENDING",
    });
  } catch (error) {
    if (error instanceof ProductError) {
      return actionError(error.code, error.message, error.details);
    }
    console.error("submitProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de la soumission du produit");
  }
}
