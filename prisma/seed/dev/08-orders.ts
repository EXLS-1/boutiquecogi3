// prisma/seed/dev/08-orders.ts
// ============================================
// DÉVELOPPEMENT — HISTORIQUE DE COMMANDES
// ============================================
// Crée des commandes dans tous les états via la factory order.
// Idempotent via upsert sur orderNumber.

import { Seeder } from "../types";
import { buildOrderFactory } from "../factories/order.factory";
import type { GeneratedVariant } from "../factories/variant.factory";
import { generateUUIDv7 } from "../utils/uuid";

export const DevOrdersSeeder: Seeder = {
  name: "dev:orders",
  order: 80,
  async run(ctx) {
    ctx.logger.start(this.name);

    const users = await ctx.prisma.user.findMany({
      where: { roleAssignment: { roleConfig: { role: "USER" } } },
      select: { id: true },
      take: 30,
    });

    // Récupérer produits + variantes réels pour construire les GeneratedVariant
    const products = await ctx.prisma.product.findMany({
      select: { id: true, name: true, price: true, variants: { select: { id: true, sku: true } } },
      take: 30,
    });

    if (users.length === 0 || products.length === 0) {
      ctx.logger.warn("Pas assez d'utilisateurs/produits — exécuter les seeds précédents.");
      return;
    }

    // Construire GeneratedVariant[] à partir des données réelles
    const generatedVariants: GeneratedVariant[] = [];
    const productIds: string[] = [];
    const productNames: string[] = [];

    for (const product of products) {
      productIds.push(product.id);
      productNames.push(product.name);
      const priceUsdCents = Math.round(Number(product.price) * 100);
      for (const v of product.variants) {
        generatedVariants.push({
          id: v.id,
          productId: product.id,
          sku: v.sku,
          attributes: {},
          priceOffset: 0,
          priceUSD: product.price.toString(),
          priceCDF: String(Math.round(priceUsdCents * 2850 / 100)),
        });
      }
    }

    if (generatedVariants.length === 0) {
      ctx.logger.warn("Aucune variante trouvée — exécuter dev:products d'abord.");
      return;
    }

    let orderCount = 0;

    for (let i = 0; i < 50; i++) {
      const user = users[i % users.length];
      const order = buildOrderFactory(i, {
        userId: user.id,
        variants: generatedVariants,
        productIds,
        productNames,
        seedNumber: ctx.seedNumber,
      });

      // 1. Commande
      await ctx.prisma.order.upsert({
        where: { orderNumber: order.orderNumber },
        update: {
          status: order.status,
          currency: order.currency,
          subtotalAmount: order.subtotalAmount,
          taxAmount: order.taxAmount,
          discountAmount: order.discountAmount,
          shippingCost: order.shippingCost,
          grandTotal: order.grandTotal,
          totalAmount: order.totalAmount,
        },
        create: {
          id: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          status: order.status,
          currency: order.currency,
          subtotalAmount: order.subtotalAmount,
          taxAmount: order.taxAmount,
          discountAmount: order.discountAmount,
          shippingCost: order.shippingCost,
          grandTotal: order.grandTotal,
          totalAmount: order.totalAmount,
        },
      });

      // 2. Items
      for (const item of order.items) {
        await ctx.prisma.orderItem.upsert({
          where: { id: item.id },
          update: { quantity: item.quantity, unitPrice: item.unitPrice },
          create: {
            id: item.id,
            orderId: order.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantSku: item.variantSku,
            attributes: {},
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            currency: item.currency,
          },
        });
      }

// 3. Statut historique (connecte la table OrderStatus via orderStatusId)
      const orderStatus = await ctx.prisma.orderStatus.findUnique({
        where: { status: order.status },
        select: { id: true },
      });
      if (orderStatus) {
        await ctx.prisma.orderStatusHistory.create({
          data: {
            id: generateUUIDv7(),
            orderId: order.id,
            orderStatusId: orderStatus.id,
            note: "Seed dev",
          },
        });
      }

      orderCount++;
    }

    ctx.logger.info(`✓ Orders (${orderCount})`);
    ctx.logger.end(this.name);
  },
};