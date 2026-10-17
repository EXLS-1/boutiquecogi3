// server/actions/product-dynamic-actions.ts
// =============================================================================
// SERVER ACTIONS — Création dynamique de produits / mouvements de stock
// =============================================================================
// Orchestre la couche transactionnelle Produit + `ProductService.createDynamicProduct`
// (implémentée dans `lib/products/product-service.ts`, voir shim
// `lib/product/productService.ts`) avec la protection d'authentification
// Better-Auth. Utilisable depuis les composants serveur/forms sans passer
// par un endpoint REST.

"use server";

import { headers } from "next/headers";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import {
  ProductService,
  ProductError,
} from "@/lib/product/productService";
import {
  invalidateAllCatalogCaches,
  CACHE_TAGS,
} from "@/lib/product-catalog/catalog-queries";
import { recordAuditLog, AuditSeverity } from "@/server/services/audit.service";
import type { ActionResult } from "@/server/core/action-result";

export type { ActionResult };

/**
 * Crée dynamiquement un produit (minimal ou complet) + son inventaire.
 * - Produit minimaliste : { name, basePrice }.
 * - Produit complet    : + description, categoryId, attributes, variants[], images.
 * Toujours atomique : produit + ≥1 variante + stock + mouvements.
 */
export async function createDynamicProductAction(payload: unknown): Promise<ActionResult> {
  let userId: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    userId = session?.user?.id ?? null;
    if (!userId) {
      await recordAuditLog({
        action: "PRODUCT_CREATE",
        userId: null,
        severity: AuditSeverity.WARNING,
        status: "FAILED",
        error: "Non authentifié",
      });
      return { success: false, error: "Non authentifié.", code: "UNAUTHORIZED" };
    }

    const result = await ProductService.createDynamicProduct(payload, userId);

    await recordAuditLog({
      action: "PRODUCT_CREATE",
      targetId: result.productId,
      targetType: "PRODUCT",
      userId,
      severity: AuditSeverity.WARNING,
      details: {
        variantCount: result.variantCount,
        totalStock: result.totalStock,
      },
    });

    // Invalidation des caches catalogue + routes produit
    await invalidateAllCatalogCaches();
    revalidateTag(CACHE_TAGS.CATALOG_PRODUCTS, "default");

    return {
      success: true,
      data: result,
      message: `Produit créé : ${result.variantCount} variante(s), ${result.totalStock} unité(s) en stock.`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Erreur serveur inattendue.";
    await recordAuditLog({
      action: "PRODUCT_CREATE",
      userId,
      severity: AuditSeverity.WARNING,
      status: "FAILED",
      error: errorMsg,
    });
    if (error instanceof ProductError) {
      return { success: false, error: error.message, code: error.code };
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
  let userId: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    userId = session?.user?.id ?? null;
    if (!userId) {
      await recordAuditLog({
        action: "STOCK_ADJUST",
        targetId: input.variantId,
        targetType: "PRODUCT_VARIANT",
        userId: null,
        severity: AuditSeverity.WARNING,
        status: "FAILED",
        error: "Non authentifié",
      });
      return { success: false, error: "Non authentifié.", code: "UNAUTHORIZED" };
    }

    const result = await ProductService.addStock(
      {
        variantId: input.variantId,
        quantity: input.quantity,
        reason: "RESTOCK",
        notes: input.notes,
      },
      userId
    );

    await recordAuditLog({
      action: "STOCK_ADJUST",
      targetId: input.variantId,
      targetType: "PRODUCT_VARIANT",
      userId,
      severity: AuditSeverity.WARNING,
      details: {
        quantity: input.quantity,
        reason: "RESTOCK",
        notes: input.notes,
      },
    });

    await invalidateAllCatalogCaches();
    return { success: true, data: result, message: "Stock mis à jour." };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Erreur serveur inattendue.";
    await recordAuditLog({
      action: "STOCK_ADJUST",
      targetId: input.variantId,
      targetType: "PRODUCT_VARIANT",
      userId,
      severity: AuditSeverity.WARNING,
      status: "FAILED",
      error: errorMsg,
    });
    if (error instanceof ProductError) {
      return { success: false, error: error.message, code: error.code };
    }
    console.error("[addStockAction]", error);
    return { success: false, error: "Erreur serveur inattendue.", code: "INTERNAL_ERROR" };
  }
}