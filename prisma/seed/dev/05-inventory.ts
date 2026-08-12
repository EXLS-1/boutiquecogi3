// prisma/seed/dev/05-inventory.ts
// ============================================
// DÉVELOPPEMENT — STOCKS INITIAUX PAR PRODUIT
// ============================================
// Crée les stocks (Stock) et les transactions d'inventaire initiales
// (RESTOCK) pour chaque produit. Idempotent.

import { Seeder } from "../types";
import { buildStockFactory } from "../factories/inventory.factory";
import { generateUUIDv7 } from "../utils/uuid";

export const DevInventorySeeder: Seeder = {
  name: "dev:inventory",
  order: 50,
  async run(ctx) {
    ctx.logger.start(this.name);

    const products = await ctx.prisma.product.findMany({
      select: { id: true },
    });
    if (products.length === 0) {
      ctx.logger.warn("Aucun produit trouvé — exécuter dev:products d'abord.");
      return;
    }

    let stockCount = 0;
    let txCount = 0;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const stock = buildStockFactory(i, product.id);

      // 1. Stock principal
      await ctx.prisma.stock.upsert({
        where: { productId: product.id },
        update: { quantity: stock.quantity, alertThreshold: stock.alertThreshold, warehouse: stock.warehouse },
        create: {
          id: stock.id,
          productId: product.id,
          quantity: stock.quantity,
          alertThreshold: stock.alertThreshold,
          warehouse: stock.warehouse,
        },
      });
      stockCount++;

      // 2. Transaction RESTOCK initiale (si aucune n'existe)
      const existing = await ctx.prisma.inventoryTransaction.count({
        where: { productId: product.id, reason: "RESTOCK" },
      });
      if (existing === 0) {
        await ctx.prisma.inventoryTransaction.create({
          data: {
            id: generateUUIDv7(),
            productId: product.id,
            quantity: stock.quantity,
            reason: "RESTOCK",
          },
        });
        txCount++;
      }
    }

    ctx.logger.info(`✓ Inventory (${stockCount} stocks, ${txCount} transactions RESTOCK)`);
    ctx.logger.end(this.name);
  },
};