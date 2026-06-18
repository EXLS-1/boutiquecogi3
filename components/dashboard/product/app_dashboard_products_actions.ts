// app/dashboard/products/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import {
  getSessionWithUser,
  resolveEffectivePermissions,
  isAdminOrSuperAdmin,
  getNumericRestriction,
} from "@/lib/auth/rbac";

const createProductSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  price: z.coerce.number().positive("Le prix doit être supérieur à 0"),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("DRAFT"),
  categoryId: z.string().optional(),
});

const bulkActionSchema = z.object({
  action: z.enum(["delete", "activate", "deactivate", "archive"]),
  ids: z.array(z.string()).min(1, "Au moins un produit doit être sélectionné"),
});

/**
 * Création unitaire d'un produit avec contrôle atomique des quotas.
 * Utilise un compteur utilisateur + transaction Serializable pour éviter les race conditions.
 */
export async function createProduct(formData: FormData) {
  const sessionData = await getSessionWithUser();
  if (!sessionData) {
    return { success: false, error: "Non autorisé : Session introuvable." };
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
    const effectivePermissions = await resolveEffectivePermissions(role as Role);
    if (!effectivePermissions.has("products:create")) {
      return {
        success: false,
        error: "Droit de création de produit manquant.",
      };
    }

    const maxProductsAllowed = await getNumericRestriction(
      role as Role,
      "MAX_PRODUCTS_PER_USER",
    );

    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { productCount: true },
        });

        const currentCount = user?.productCount ?? 0;

        if (currentCount >= maxProductsAllowed) {
          throw new Error(
            `Limite maximale atteinte (${maxProductsAllowed} produits autorisés pour votre rôle).`,
          );
        }

        const [product] = await Promise.all([
          tx.product.create({
            data: {
              ...parsed.data,
              userId,
            },
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
    return {
      success: false,
      error: error.message || "Une erreur est survenue lors de la création.",
    };
  }
}

/**
 * Traitement par lots sécurisé avec vérification hiérarchique centralisée.
 */
export async function bulkProductsAction(payload: unknown) {
  const sessionData = await getSessionWithUser();
  if (!sessionData || !sessionData.userId) {
    return { success: false, error: "Non authentifié ou session expirée." };
  }

  const { userId, role } = sessionData;

  const parsed = bulkActionSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Payload invalide ou corrompu." };
  }

  const { action, ids } = parsed.data;
  const effectivePermissions = await resolveEffectivePermissions(role as Role);

  if (action === "delete") {
    if (!isAdminOrSuperAdmin(role as Role)) {
      return {
        success: false,
        error:
          "Sécurité : Seuls les administrateurs (Niveau 1 & 2) peuvent exécuter des suppressions globales.",
      };
    }
    if (!effectivePermissions.has("products:delete")) {
      return { success: false, error: "Permission de suppression manquante." };
    }
  }

  if (["archive", "activate", "deactivate"].includes(action)) {
    const requiredPerms = ["products:update", "products:bulk-edit"] as const;
    const hasBulkPerm = requiredPerms.some((p) =>
      effectivePermissions.has(p as any),
    );
    if (!hasBulkPerm) {
      return {
        success: false,
        error: "Droit de modification de masse manquant.",
      };
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      switch (action) {
        case "delete":
          return await tx.product.deleteMany({ where: { id: { in: ids } } });
        case "activate":
          return await tx.product.updateMany({
            where: { id: { in: ids } },
            data: { status: "ACTIVE" },
          });
        case "deactivate":
          return await tx.product.updateMany({
            where: { id: { in: ids } },
            data: { status: "DRAFT" },
          });
        case "archive":
          return await tx.product.updateMany({
            where: { id: { in: ids } },
            data: { status: "ARCHIVED" },
          });
        default:
          throw new Error("Action non reconnue.");
      }
    });

    revalidatePath("/dashboard/products");
    return { success: true, count: result.count };
  } catch (error: any) {
    console.error(`[BULK_ERROR] User: ${userId} | Action: ${action} :`, error);
    return {
      success: false,
      error: error.message || "Erreur interne du serveur lors de la mutation.",
    };
  }
}
