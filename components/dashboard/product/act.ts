"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import {
  getSessionWithUser,
  resolveEffectivePermissions,
  getRoleLevel,
  isAdminOrSuperAdmin,
  getNumericRestriction, // ✅ Depuis rbac.ts
} from "@/lib/auth/rbac";

export async function createProduct(formData: FormData) {
  const sessionData = await getSessionWithUser();
  if (!sessionData) {
    return { success: false, error: "Non authentifié." };
  }

  const { userId, role } = sessionData;
  const data = Object.fromEntries(formData);
  const parsed = createProductSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      error: "Données invalides",
      details: parsed.error.format(),
    };
  }

  try {
    const effectivePermissions = await resolveEffectivePermissions(role);
    if (!effectivePermissions.has("products:create")) {
      return { success: false, error: "Permission insuffisante." };
    }

    const maxProductsAllowed = await getNumericRestriction(
      role,
      "MAX_PRODUCTS_PER_USER",
    );

    const result = await prisma.$transaction(
      async (tx) => {
        // 🔒 Approche atomique avec compteur utilisateur
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { productCount: true },
        });

        if (!user || user.productCount >= maxProductsAllowed) {
          throw new Error(`Limite atteinte (${maxProductsAllowed} produits).`);
        }

        const [product] = await Promise.all([
          tx.product.create({
            data: { ...parsed.data, userId }, // ✅ createdBy → userId (cohérence)
          }),
          tx.user.update({
            where: { id: userId },
            data: { productCount: { increment: 1 } },
          }),
        ]);

        return product;
      },
      {
        isolationLevel: "Serializable",
        maxWait: 5000,
        timeout: 10000,
      },
    );

    revalidatePath("/dashboard/products");
    return { success: true, product: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Erreur serveur." };
  }
}

export async function bulkProductsAction(payload: unknown) {
  const sessionData = await getSessionWithUser();
  if (!sessionData) {
    return { success: false, error: "Non authentifié." };
  }

  const { userId, role } = sessionData;
  const parsed = bulkActionSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Payload invalide." };
  }

  const { action, ids } = parsed.data;

  // ✅ Utilisation centralisée de la hiérarchie
  if (action === "delete" && !isAdminOrSuperAdmin(role)) {
    return {
      success: false,
      error: "Sécurité : Suppression réservée aux administrateurs.",
    };
  }

  const effectivePermissions = await resolveEffectivePermissions(role);

  if (action === "delete" && !effectivePermissions.has("products:delete")) {
    return { success: false, error: "Permission de suppression manquante." };
  }

  if (["archive", "activate", "deactivate"].includes(action)) {
    const requiredPerms = ["products:update", "products:bulk-edit"] as const;
    const hasBulkPerm = requiredPerms.some((p) => effectivePermissions.has(p));
    if (!hasBulkPerm) {
      return {
        success: false,
        error: "Droit de modification de masse manquant.",
      };
    }
  }

  // ... reste identique
}
