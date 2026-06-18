// app/dashboard/products/actions.ts

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  getSessionWithUser,
  resolveEffectivePermissions,
  getRoleLevel,
  isAdminOrSuperAdmin,
  getNumericRestriction,
  RESTRICTIONS,
  PERMISSIONS,
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
 * Création unitaire d'un produit avec contrôle strict des restrictions de quota (RoleRestrictions)
 */
export async function createProduct(formData: FormData) {
  const sessionData = await getSessionWithUser();
  if (!sessionData || !sessionData.userId)
    return { success: false, error: "Non authentifié." };

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
    const { userId, role } = sessionData;

    const effectivePermissions = await resolveEffectivePermissions(
      role as Role,
    );
    if (!effectivePermissions.has("products:create")) {
      return {
        success: false,
        error: "Vous n'avez pas le Droit de création de produit.",
      };
    }

    // Récupération de la restriction quantitative liée au rôle (ex: 10 produits max)
    const maxProductsAllowed = await getNumericRestriction(
      role as Role,
      RESTRICTIONS.MAX_PRODUCTS_PER_USER,
    );

    const result = await prisma.$transaction(
      async (tx) => {
        // Pour une protection atomique contre les race conditions,
        // nous allons verrouiller la ligne de l'utilisateur et son compteur de produits.
        // Cela nécessite que votre modèle User ait un champ 'productCount'.
        // Exemple: model User { id String @id @default(uuid()) ... productCount Int @default(0) }
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { productCount: true },
        });

        if (!user || user.productCount >= maxProductsAllowed) {
          throw new Error(
            `Limite maximale atteinte (${maxProductsAllowed} produits autorisés pour votre rôle).`,
          );
        }

        // Créer le produit et incrémenter le compteur de l'utilisateur de manière atomique
        const [product] = await Promise.all([
          tx.product.create({
            data: {
              ...parsed.data,
              createdBy: { connect: { id: userId } },
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
        // Utilisation du niveau d'isolation "Serializable" pour une protection maximale
        // contre les anomalies de concurrence, y compris les race conditions.
        isolationLevel: "Serializable",
        maxWait: 5000, // Temps maximal d'attente pour un verrou (en ms)
        timeout: 10000, // Temps maximal pour la transaction (en ms)
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
 * Traitement par lots sécurisé
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
    if (!effectivePermissions.has("products:delete")) {
      return { success: false, error: "Permission de suppression manquante." };
    }

    if (!isAdminOrSuperAdmin(role)) {
      return {
        success: false,
        error: "Sécurité : Opération réservée aux administrateurs.",
      };
    }
  }

  if (["archive", "activate", "deactivate"].includes(action)) {
    if (
      !effectivePermissions.has(PERMISSIONS.PRODUCTS_UPDATE) &&
      !effectivePermissions.has(PERMISSIONS.PRODUCTS_BULK_EDIT)
    ) {
      return {
        success: false,
        error: "Droit de modification de masse manquant.",
      };
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      switch (action) {
        case "delete": {
          const productsToDelete = await tx.product.findMany({
            where: { id: { in: ids } },
            select: { userId: true },
          });

          if (productsToDelete.length === 0) {
            return { count: 0 };
          }

          const deletionsPerUser: Record<string, number> =
            productsToDelete.reduce(
              (acc, product) => {
                acc[product.userId] = (acc[product.userId] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>,
            );

          const deleteResult = await tx.product.deleteMany({
            where: { id: { in: ids } },
          });

          const userUpdates = Object.entries(deletionsPerUser).map(
            ([ownerId, count]) =>
              tx.user.update({
                where: { id: ownerId, productCount: { gte: count } }, // Ensure productCount doesn't go negative
                data: { productCount: { decrement: count } },
              }),
          );

          await Promise.all(userUpdates);
          return deleteResult;
        }
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
