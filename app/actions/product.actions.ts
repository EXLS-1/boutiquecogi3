// app/actions/product.actions.ts
'use server';

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { Product } from "@prisma/client";

// Type standardisé pour les actions serveur
export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

interface GetActiveProductsParams {
  category?: string;
}

/**
 * Action métier :
 * - retourne les produits actifs
 * - filtrage optionnel par catégorie
 * - cache serveur
 */
export const getActiveProducts = cache(
  async (
    params: GetActiveProductsParams = {}
  ): Promise<ActionResponse<Product[]>> => {
    try {
      const { category } = params;

      const products = await prisma.product.findMany({
        where: {
          isArchived: false,
          ...(category && { category }),
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        success: true,
        data: products,
      };
    } catch (error) {
      console.error("[getActiveProducts]", error);

      return {
        success: false,
        error: "Impossible de charger le catalogue pour le moment.",
      };
    }
  }
);
