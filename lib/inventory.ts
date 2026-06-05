// lib/inventory.ts
// Ce module gère la logique d'inventaire, notamment la réconciliation entre le snapshot de stock et les transactions d'inventaire (ledger).
// La fonction `calculateRealStock` est essentielle pour garantir l'exactitude du stock affiché et pour identifier les éventuelles divergences qui pourraient survenir en raison de problèmes de synchronisation ou d'erreurs humaines.
// En cas de divergence, un avertissement est loggé pour alerter les développeurs ou les administrateurs, et une action corrective peut être envisagée pour resynchroniser le stock.

import { prisma } from "@/lib/prisma";

/**
 * Réconcilie le snapshot du stock d'une variante avec son historique de transactions (ledger).
 * Cette fonction est cruciale pour l'audit et la correction d'éventuelles dérives.
 *
 * @param variantId L'identifiant UUID v7 de la variante
 * @returns Le stock réel calculé
 */
export async function calculateRealStock(variantId: string): Promise<number> {
  try {
    // 1. Récupération simultanée du snapshot et de la somme du ledger pour la performance
    const [variant, aggregate] = await Promise.all([
      prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { stock: true, sku: true },
      }),
      prisma.inventoryTransaction.aggregate({
        where: { productVariantId: variantId },
        _sum: { quantity: true },
      }),
    ]);

    if (!variant) throw new Error(`Variante ${variantId} introuvable.`);

    const ledgerTotal = aggregate._sum.quantity || 0;
    const snapshot = variant.stock;

    // 2. Logique de réconciliation
    if (ledgerTotal !== snapshot) {
      console.warn(
        `[INVENTORY_MISMATCH] SKU: ${variant.sku} | Snapshot: ${snapshot} | Ledger: ${ledgerTotal}. ` +
          `Une synchronisation pourrait être nécessaire.`,
      );
      // Note : Dans un flux d'admin, on pourrait proposer ici un `update` pour resynchroniser le snapshot.
    }

    return ledgerTotal;
  } catch (error) {
    console.error("[CALCULATE_REAL_STOCK_ERROR]", error);
    throw error;
  }
}
