// prisma/seed/dev/09-payments.ts
// ============================================
// DÉVELOPPEMENT — LOGS DE PAIEMENT (CINETPAY)
// ============================================
// Crée des enregistrements de paiement pour les commandes payées.
// Idempotent via upsert sur transactionId.

import { Seeder } from "../types";
import { generateUUIDv7 } from "../utils/uuid";

export const DevPaymentsSeeder: Seeder = {
  name: "dev:payments",
  order: 90,
  async run(ctx) {
    ctx.logger.start(this.name);

    // Commandes payables (PAID, PROCESSING, SHIPPED, DELIVERED)
    const orders = await ctx.prisma.order.findMany({
      where: { status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] } },
      select: { id: true, totalAmount: true, currency: true },
      take: 30,
    });

    let paymentCount = 0;

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const transactionId = `CP-RDC-${String(i + 1).padStart(8, "0")}`;

      await ctx.prisma.payment.upsert({
        where: { orderId: order.id },
        update: {
          amount: order.totalAmount,
          currency: order.currency,
          status: "COMPLETED",
          method: "CINETPAY",
          transactionId,
          paidAt: new Date(),
        },
        create: {
          id: generateUUIDv7(),
          orderId: order.id,
          amount: order.totalAmount,
          currency: order.currency,
          status: "COMPLETED",
          method: "CINETPAY",
          transactionId,
          paidAt: new Date(),
        },
      });
      paymentCount++;
    }

    ctx.logger.info(`✓ Payments (${paymentCount})`);
    ctx.logger.end(this.name);
  },
};