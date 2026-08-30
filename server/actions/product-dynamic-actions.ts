// server/actions/product-dynamic-actions.ts
// =============================================================================
// SERVER ACTIONS — Création dynamique de produits / mouvements de stock
// =============================================================================
// Orchestre la couche lib/products/productService.ts (transactionnelle) avec
// la protection d'authentification Better-Auth. Utilisable depuis les
// composants serveur/forms sans passer par un endpoint REST.

"use server";

import { headers } from "next/headers";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { ProductService, ProductError } from "@/lib/products/productService";
import { invalidateAllCatalogCaches } from "@/lib/product-catalog/catalog-queries";

type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code: string; details?: unknown };

/**
 * Crée dynamiquement un produit (minimal ou complet) + son inventaire.
 * - Produit minimaliste : { name, basePrice }.
 * - Produit complet    : + description, categoryId, attributes, variants[], images.
 * Toujours atomique : produit + ≥1 variante + stock + mouvements.
 */
export async function createDynamicProductAction(payload: unknown): Promise<ActionResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return { success: false, error: "Non authentifié.", code: "UNAUTHORIZED" };
    }

    const result = await ProductService.createDynamicProduct(payload, session.user.id);

    // Invalidation des caches catalogue + routes produit
    await invalidateAllCatalogCaches();
    revalidateTag("catalog-products", "default");

    return {
      success: true,
      data: result,
      message: `Produit créé : ${result.variantCount} variante(s), ${result.totalStock} unité(s) en stock.`,
    };
  } catch (error) {
    if (error instanceof ProductError) {
      return { success: false, error: error.message, code: error.code, details: error.details };
    }
    console.error("[createDynamicProductAction]", error);
    return { success: false, error: "Erreur serveur inattendue.", code: "INTERNAL_ERROR" };
  }
}

/**
 * Introduit une entrée de stock positive pour une variante (RESTOCK).
 */
export async function addStockAction(input: {
  variantId: string;
  quantity: number;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return { success: false, error: "Non authentifié.", code: "UNAUTHORIZED" };
    }

    const result = await ProductService.addStock(
      {
        variantId: input.variantId,
        quantity: input.quantity,
        reason: "RESTOCK",
        notes: input.notes,
      },
      session.user.id
    );

    await invalidateAllCatalogCaches();
    return { success: true, data: result, message: "Stock mis à jour." };
  } catch (error) {
    if (error instanceof ProductError) {
      return { success: false, error: error.message, code: error.code };
    }
    console.error("[addStockAction]", error);
    return { success: false, error: "Erreur serveur inattendue.", code: "INTERNAL_ERROR" };
  }
}