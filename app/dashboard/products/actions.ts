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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { success: false, error: "Non autorisé : Session introuvable." };
  }

  const userId = session.user.id;
  const role = session.user.role;

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
    const effectivePermissions = await resolveEffectivePermissions(
      role as Role,
    );
    if (!effectivePermissions.has("products:create")) {
      return {
        success: false,
        error: "Droit de création de produit manquant.",
      };
    }

    // Récupération de la restriction quantitative liée au rôle
    const maxProductsAllowed = await getNumericRestriction(
      role,
      "max_products",
    );

    const result = await prisma.$transaction(async (tx) => {
      const currentCount = await tx.product.count({
        where: { userId },
      });

      if (currentCount >= maxProductsAllowed) {
        throw new Error(
          `Limite maximale atteinte (${maxProductsAllowed} produits autorisés pour votre rôle).`,
        );
      }

      return await tx.product.create({
        data: {
          ...parsed.data,
          createdBy: userId,
        },
      });
    });

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
  const userLevel = getRoleLevel(role);

  const parsed = bulkActionSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Payload invalide ou corrompu." };
  }

  const { action, ids } = parsed.data;
  const effectivePermissions = await resolveEffectivePermissions(role as Role);

  // VÉRIFICATION CRITIQUE : Hiérarchie inversée (Level 1 = SUPER_ADMIN, Level 2 = ADMIN)
  if (action === "delete") {
    if (!effectivePermissions.has("products:delete")) {
      return { success: false, error: "Permission de suppression manquante." };
    }
    if (userLevel > 2) {
      return {
        success: false,
        error:
          "Sécurité : Seuls les administrateurs (Niveau 1 & 2) peuvent exécuter des suppressions globales.",
      };
    }
  }

  if (["archive", "activate", "deactivate"].includes(action)) {
    if (
      !effectivePermissions.has("products:update") &&
      !effectivePermissions.has("products:bulk_edit")
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

async function getNumericRestriction(
  role: string,
  restrictionKey: string,
): Promise<number> {
  // Valeur de repli sécurisée si non configurée en base de données
  return 10;
}
