// prisma/seed/scenarios/high-volume-orders.ts
// ============================================
// SCÉNARIO — VOLUMÉTRIE ÉLEVÉE (STRESS TEST)
// ============================================
// Injecte un grand volume de commandes via batching transactionnel
// (executeInBatches) pour éviter les timeouts PostgreSQL.
// À exécuter à la demande via CLI --scenario=high-volume-orders.

import { Seeder } from "../types";
import { executeInBatches } from "../transaction";
import { buildOrderFactory } from "../factories/order.factory";
import type { GeneratedOrder } from "../factories/order.factory";

const TOTAL_ORDERS = 2500;
const BATCH_SIZE = 500;

export const HighVolumeOrdersScenario: Seeder = {
  name: "scenario:high-volume-orders",
  order: 100,
  async run(ctx) {
    ctx.logger.start(this.name);

    // 1. Récupération des clés étrangères existantes
    const users = await ctx.prisma.user.findMany({ select: { id: true }, take: 50 });
    const variants = await ctx.prisma.productVariant.findMany({
      select: { id: true, sku: true, attributes: true, priceOffset: true },
      take: 100,
    });
    const products = await ctx.prisma.product.findMany({ select: { id: true, name: true }, take: 100 });

    if (users.length === 0 || variants.length === 0 || products.length === 0) {
      ctx.logger.warn("Données préalables manquantes — exécuter d'abord le seed DEV.");
      return;
    }

    // Convertir les variantes récupérées au format GeneratedVariant attendu
    // (priceUSD/priceCDF dérivés de priceOffset pour rester cohérent).
    const genVariants = variants.map((v, i) => ({
      id: v.id,
      productId: products[i % products.length]?.id ?? "",
      sku: v.sku,
      attributes: v.attributes as Record<string, string>,
      priceOffset: v.priceOffset,
      priceUSD: ((v.priceOffset + 2500) / 100).toFixed(2),
      priceCDF: String((v.priceOffset + 2500) * 2850),
    }));

    const productIds = products.map((p) => p.id);
    const productNames = products.map((p) => p.name);

    // 2. Pré-génération des commandes en mémoire
    const orders: GeneratedOrder[] = [];
    for (let i = 0; i < TOTAL_ORDERS; i++) {
      orders.push(
        buildOrderFactory(i, {
          userId: users[i % users.length].id,
          variants: genVariants,
          productIds,
          productNames,
          seedNumber: ctx.seedNumber,
        }),
      );
    }

    // 3. Insertion par lots (orders puis orderItems)
    await executeInBatches(ctx, orders, BATCH_SIZE, async (batch, tx) => {
      for (const o of batch) {
        const created = await tx.order.upsert({
          where: { orderNumber: o.orderNumber },
          update: {},
          create: {
            id: o.id,
            orderNumber: o.orderNumber,
            userId: o.userId,
            status: o.status,
            subtotalAmount: o.subtotalAmount,
            taxAmount: o.taxAmount,
            discountAmount: o.discountAmount,
            grandTotal: o.grandTotal,
            shippingCost: o.shippingCost,
            totalAmount: o.totalAmount,
            currency: o.currency,
          },
        });

        for (const item of o.items) {
          const product = products.find((p) => p.id === item.productId);
          await tx.orderItem.upsert({
            where: { id: item.id },
            update: {},
            create: {
              id: item.id,
              orderId: created.id,
              productId: item.productId,
              variantId: item.variantId,
              productName: product?.name ?? item.productName,
              variantSku: item.variantSku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
              currency: item.currency,
            },
          });
        }
      }
    });

    ctx.logger.info(`✓ High volume : ${TOTAL_ORDERS} commandes insérées.`);
    ctx.logger.end(this.name);
  },
};
</content>
