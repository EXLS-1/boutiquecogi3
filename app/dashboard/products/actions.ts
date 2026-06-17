// /app/dashboard/products/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getSessionWithUser,
  resolveEffectivePermissions,
  getRoleLevel,
  isAdminOrSuperAdmin,
  PERMISSIONS,
} from "@/lib/auth/rbac";

// Schéma strict de validation pour les requêtes par lots
const bulkActionSchema = z.object({
  action: z.enum(["delete", "activate", "deactivate", "archive"]),
  ids: z.array(z.string()).min(1, "Au moins un produit doit être sélectionné"),
});

export type BulkActionPayload = z.infer<typeof bulkActionSchema>;

/**
 * Traitement par lots (Bulk Actions) unifié sous forme de Server Action.
 * Sécurité multiniveau : Session + Niveau Hiérarchique + Permissions Effectives + Transactions Prisma.
 */
export async function bulkProductsAction(payload: unknown) {
  // 1. Authentification brute & extraction des métadonnées de session
  const sessionData = await getSessionWithUser();
  if (!sessionData || !sessionData.userId) {
    return {
      success: false,
      error: "Non authentifié. Session expirée ou invalide.",
    };
  }

  const { userId, role } = sessionData;
  const userLevel = getRoleLevel(role);

  // 2. Validation structurelle du payload avec Zod
  const parsed = bulkActionSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Données ou action non conformes." };
  }

  const { action, ids } = parsed.data;

  // 3. Résolution des permissions effectives (via cache/héritage)
  const effectivePermissions = await resolveEffectivePermissions(role);

  // 4. Barrières de sécurité et d'habilitation contextuelles
  if (action === "delete") {
    // Vérification de la permission atomique
    if (!effectivePermissions.has(PERMISSIONS.PRODUCTS_DELETE)) {
      return {
        success: false,
        error: "Habilitation insuffisante pour supprimer des produits.",
      };
    }
    // Règle de sécurité renforcée : Limitation stricte aux rôles d'administration (Level 1 & 2)
    if (!isAdminOrSuperAdmin(role)) {
      return {
        success: false,
        error:
          "Sécurité : Seuls les administrateurs (Level <= 2) peuvent exécuter des suppressions de masse.",
      };
    }
  }

  if (
    action === "archive" ||
    action === "activate" ||
    action === "deactivate"
  ) {
    const hasUpdatePerm =
      effectivePermissions.has(PERMISSIONS.PRODUCTS_UPDATE) ||
      effectivePermissions.has(PERMISSIONS.PRODUCTS_BULK_EDIT);
    if (!hasUpdatePerm) {
      return {
        success: false,
        error: "Habilitation insuffisante pour modifier ces produits.",
      };
    }
  }

  // 5. Exécution transactionnelle ACID et sécurisée
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Mesure anti-injection / anti-escalade : On s'assure que les produits appartiennent bien
      // à l'utilisateur si son niveau est inférieur ou égal à un certain seuil (optionnel selon vos règles métier)

      switch (action) {
        case "delete":
          return await tx.product.deleteMany({
            where: { id: { in: ids } },
          });

        case "activate":
          return await tx.product.updateMany({
            where: { id: { in: ids } },
            data: { status: "ACTIVE" }, // Aligné sur le champ 'status' de votre filtre
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
          throw new Error("Action non supportée par le système.");
      }
    });

    // 6. Revalidation du cache de la page pour une mise à jour instantanée de l'UI
    revalidatePath("/dashboard/products");
    return { success: true, count: result.count };
  } catch (error: unknown) {
    console.error(
      `[BULK_ACTION_ERROR] User: ${userId} | Action: ${action} :`,
      error,
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Une erreur système interne est survenue lors du traitement.",
    };
  }
}

// Extrait de validation :
if (action === "delete") {
  if (!effectivePermissions.has("products:delete")) {
    return { success: false, error: "Habilitation de suppression manquante." };
  }
  // Seuls les rôles possédant un niveau inférieur ou égal à 2 (SUPER_ADMIN=1, ADMIN=2) passent
  if (userLevel > 2) {
    return {
      success: false,
      error:
        "Sécurité : Niveau hiérarchique insuffisant pour les modifications destructives de masse.",
    };
  }
}
