// lib/actions/category.actions.ts
/**
 * Actions liées aux catégories.
 * Ces actions sont utilisées pour gérer les catégories dans l'application.
 * Elles incluent la récupération des catégories et la mise à jour d'une catégorie existante.
 */

"use server";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { guardPermission } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/rbac";

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

const CategoryUpdateSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .optional(),
  slug: z
    .string()
    .min(2, "Le slug doit contenir au moins 2 caractères")
    .optional(),
  description: z.string().optional(),
  imageUrl: z.string().url("URL d'image invalide").optional().or(z.literal("")),
});

export type CategoryUpdateInput = z.infer<typeof CategoryUpdateSchema>;

export const getCategories = cache(
  async (): Promise<
    ActionResponse<{ id: string; name: string; slug: string }[]>
  > => {
    try {
      const categories = await prisma.category.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      });

      return { success: true, data: categories };
    } catch (error) {
      console.error("[getCategories]", error);
      return {
        success: false,
        error: "Impossible de charger les catégories",
        code: "CATEGORIES_FETCH_ERROR",
      };
    }
  },
);

/**
 * Met à jour une catégorie existante.
 * Action protégée par RBAC pour les administrateurs.
 */
export async function updateCategoryAction(
  id: string,
  data: CategoryUpdateInput,
): Promise<
  ActionResponse<Awaited<ReturnType<typeof prisma.category.update>>>
> {
  try {
    // 1. Vérification de sécurité (Admin uniquement)
    await guardPermission(PERMISSIONS.CATEGORIES_UPDATE);

    // 2. Validation des données
    const validatedData = CategoryUpdateSchema.parse(data);

    // 3. Mise à jour en base de données
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: validatedData,
    });

    // 4. Invalidation du cache pour rafraîchir l'UI partout
    revalidatePath("/dashboard/admin");
    revalidatePath("/(shop)", "layout");

    return { success: true, data: updatedCategory };
  } catch (error) {
    console.error("[updateCategoryAction]", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Données invalides",
        code: "VALIDATION_ERROR",
      };
    }

    return {
      success: false,
      error: "Erreur lors de la mise à jour de la catégorie",
      code: "CATEGORY_UPDATE_ERROR",
    };
  }
}
