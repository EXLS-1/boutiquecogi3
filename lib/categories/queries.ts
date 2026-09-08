// lib/categories/queries.ts
/**
 * Requêtes catégories (côté serveur, SANS directive "use server").
 *
 * IMPORTANT : ce fichier ne doit PAS contenir de directive "use server" —
 * le Data Cache (unstable_cache) ne peut pas vivre dans un module "use server"
 * (le compilateur transforme tous les exports et casse le module).
 * Les Server Actions de lib/actions/category.actions.ts appellent ces fonctions.
 */

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  CACHE_TAGS,
  CACHE_DURATIONS,
} from "@/lib/product-catalog/catalog-constants";

export type CategoryDTO = { id: string; name: string; slug: string };

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

// Fonction cachée au niveau du module (une seule instance, pas recréée à chaque appel).
const getCachedCategories = unstable_cache(
  async (): Promise<CategoryDTO[]> => {
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
    return categories satisfies CategoryDTO[];
  },
  ["get-categories"],
  {
    tags: [CACHE_TAGS.CATEGORIES],
    revalidate: CACHE_DURATIONS.CATEGORIES,
  },
);

/**
 * Récupère les catégories (cache inter-requêtes, tag revalidé par les mutations).
 * Le wrapper cache() de React déduplique les appels au sein d'un même rendu.
 */
export const getCategoriesCached = cache(
  async (): Promise<ActionResponse<CategoryDTO[]>> => {
    try {
      const categories = await getCachedCategories();
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
