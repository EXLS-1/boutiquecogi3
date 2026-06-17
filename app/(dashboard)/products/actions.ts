// /app/(dashboard)/products/actions.ts
"use server";

import { withPermission, PERMISSIONS, RESTRICTIONS } from "@/lib/auth/rbac";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Schémas de validation Zod
const createProductSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().positive(),
});

const bulkActionSchema = z.object({
  action: z.enum(["delete", "activate", "deactivate", "archive"]),
  ids: z.array(z.string()).min(1, "Au moins un produit doit être sélectionné"),
});

// Action unitaire existante (optimisée)
export async function createProduct(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized: User not logged in.");
  const userId = session.user.id;

  return withPermission(PERMISSIONS.PRODUCTS_CREATE, async (role: string) => {
    try {
      const data = Object.fromEntries(formData);
      const parsed = createProductSchema.safeParse(data);

      if (!parsed.success) {
        return {
          success: false,
          error: "Données invalides",
          details: parsed.error.format(),
        };
      }

      const maxProducts = await getNumericRestriction(
        role,
        RESTRICTIONS.MAX_PRODUCTS_PER_USER,
      );

      const result = await prisma.$transaction(async (tx) => {
        const currentCount = await tx.product.count({ where: { userId } });
        if (currentCount >= maxProducts) {
          throw new Error(`Limite de produits atteinte (${maxProducts}).`);
        }
        return await tx.product.create({
          data: { ...parsed.data, userId },
        });
      });

      revalidatePath("/products");
      return { success: true, product: result };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Une erreur inconnue est survenue",
      };
    }
  });
}

/**
 * NOUVEAU : Server Action Unifiée pour les traitements par lot (Bulk)
 */
export async function bulkProductsAction(payload: unknown) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Non autorisé" };

  const parsed = bulkActionSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Données ou action invalides" };
  }

  const { action, ids } = parsed.data;

  // Assignation de la permission requise selon l'action demandée
  let requiredPermission = PERMISSIONS.PRODUCTS_UPDATE;
  if (action === "delete") requiredPermission = PERMISSIONS.PRODUCTS_DELETE;
  if (action === "archive") requiredPermission = PERMISSIONS.PRODUCTS_BULK_EDIT;

  return withPermission(requiredPermission, async () => {
    try {
      const result = await prisma.$transaction(async (tx) => {
        switch (action) {
          case "delete":
            return await tx.product.deleteMany({
              where: { id: { in: ids } },
            });
          case "activate":
            return await tx.product.updateMany({
              where: { id: { in: ids } },
              data: { isActive: true }, // Ajustez selon votre schéma exact
            });
          case "deactivate":
            return await tx.product.updateMany({
              where: { id: { in: ids } },
              data: { isActive: false },
            });
          case "archive":
            return await tx.product.updateMany({
              where: { id: { in: ids } },
              data: { isArchived: true }, // Ajustez selon votre schéma exact
            });
          default:
            throw new Error("Action non supportée");
        }
      });

      revalidatePath("/products");
      return { success: true, count: result.count };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'exécution du traitement par lot",
      };
    }
  });
}

async function getNumericRestriction(
  role: string,
  restrictionKey: string,
): Promise<number> {
  const restriction = await prisma.roleRestriction.findUnique({
    where: { role_restrictionKey: { role, restrictionKey } },
  });
  return restriction?.value ?? 10;
}
