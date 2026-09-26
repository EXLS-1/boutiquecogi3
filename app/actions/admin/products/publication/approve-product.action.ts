// app/actions/admin/products/publication/approve-product.action.ts
// SERVER ACTION — Approbation (PENDING → PUBLISHED)

"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAuth, hasPermission, PermissionCode } from "@/lib/auth/rbac";
import { actionError, actionSuccess } from "../_shared/action-result";
import { ProductServiceError } from "@/lib/product/product.service";

const ApproveSchema = z.object({
  productId: z.string().uuid("ID de produit invalide"),
  reason: z.string().max(500, "La raison est trop longue").optional(),
});

export async function approveProductAction(input: unknown) {
  // 1. Authentification via requireAuth (retourne le Role, redirige si non authentifié)
  const role = await requireAuth();
  if (!role) {
    return actionError("UNAUTHORIZED", "Non authentifié");
  }

  // 2. Récupérer les données utilisateur complètes pour l'ID
  const { getCurrentUserFromProvider } = await import("@/lib/auth/session-provider");
  const user = await getCurrentUserFromProvider();
  if (!user) {
    return actionError("UNAUTHORIZED", "Utilisateur non trouvé");
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
  const requiredPermission = "products:moderate" as PermissionCode;
  const hasAccess = await hasPermission(role, requiredPermission);
  if (!hasAccess) {
    return actionError("FORBIDDEN", "Permission insuffisante pour approuver ce produit");
  }

  // 5. Appel au service de publication (ProductService.publish ne prend que productId + actor)
  try {

    // 7. Revalidation du cache (updateTag pour expiration immédiate)
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.productId}`);
    revalidateTag("admin:products:list", "max");
    revalidateTag("admin:products:kpis", "max");

    return actionSuccess("PRODUCT_APPROVED", "Produit approuvé et publié");
  } catch (error) {
    if (error instanceof ProductServiceError) {
      return actionError(error.code, error.message);
    }
    console.error("approveProductAction error:", error);
    return actionError("INTERNAL_ERROR", "Erreur lors de l'approbation du produit");
  }
}