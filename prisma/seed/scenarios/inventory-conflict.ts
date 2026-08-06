// prisma/seed/scenarios/inventory-conflict.ts
// ============================================
// SCÉNARIO — CONFLIT D'INVENTAIRE (RACE CONDITION)
// ============================================
// Simule un stock critique (1 unité) avec 3 réservations simultanées :
// 1 réussit, 2 échouent pour rupture de stock. Traitement atomique
// via transaction Prisma.

import { Seeder } from "../types";
import { generateDeterministicUuidV7 } from "../utils/uuid";

export const InventoryConflictScenario: Seeder = {
  name: "scenario:inventory-conflict",
  order: 101,
  async run(ctx) {
    ctx.logger.start(this.name);

    const ns = "scenario-inv-conflict";
    const categoryId = generateDeterministicUuidV7(ns, 1);
    const productId = generateDeterministicUuidV7(ns, 3);
    const variantId = generateDeterministicUuidV7(ns, 4);

    // Utilisateurs participants
    const users = await ctx.prisma.user.findMany({ select: { id: true }, take: 3 });
    if (users.length < 3) {
      ctx.logger.warn("Il faut au moins 3 utilisateurs — exécuter d'abord le seed DEV.");
      return;
    }

    // 1. Produit à stock critique (1 seule unité)
    await ctx.prisma.$transaction(async (tx) => {
      await tx.category.upsert({
        where: { id: categoryId },
        update: {},
        create: {
          id: categoryId,
          name: "Scénario Flash Sales",
          slug: "scenario-flash-sales",
          description: "Catégorie de test pour conflit d'inventaire",
          subtitle: "",
          displayOrder: 0,
          OrderBy: "displayOrder",
        },
      });

      const creatorId = users[0].id;
      await tx.product.upsert({
        where: { id: productId },
        update: {},
        create: {
          id: productId,
          name: "iPhone Édition Limitée Kinshasa",
          slug: "iphone-edition-limitee-kinshasa",
          sku: "SKU-FLASH-001",
          description: "Produit test pour simulation de conflit d'inventaire.",
          price: 120000,
          basePrice: 120000,
          currency: "USD",
          categoryId,
          userId: creatorId,
          isActive: true,
          status: "PUBLISHED",
        },
      });

      await tx.productVariant.upsert({
        where: { id: variantId },
        update: {},
        create: {
          id: variantId,
          productId,
          sku: "SKU-FLASH-001-NOIR",
          attributes: { couleur: "Noir", stock: "critique" },
          priceOffset: 0,
        },
      });

      // Stock critique : 1 unité
      await tx.stock.upsert({
        where: { productId },
        update: { quantity: 1, reserved: 0 },
        create: {
          id: generateDeterministicUuidV7(ns, 5),
          productId,
          quantity: 1,
          reserved: 0,
        },
      });
    });

    // 2. Traitement atomique du conflit
    await ctx.prisma.$transaction(async (tx) => {
      const stock = await tx.stock.findUniqueOrThrow({ where: { productId } });

      // Client A réussit (stock >= 1)
      if (stock.quantity >= 1) {
        await tx.stock.update({
          where: { productId },
          data: { quantity: { decrement: 1 }, reserved: { increment: 1 } },
        });

        await tx.order.create({
          data: {
            id: generateDeterministicUuidV7(ns, 20),
            orderNumber: "BC3-CONFLICT-WINNER",
            userId: users[0].id,
            status: "CONFIRMED",
            currency: "USD",
            subtotalAmount: 120000,
            taxAmount: 0,
            discountAmount: 0,
            shippingCost: 0,
            grandTotal: 120000,
            totalAmount: 120000,
          },
        });
      }

      // Clients B & C rejetés (rupture de stock)
      for (let i = 1; i < users.length; i++) {
        await tx.order.create({
          data: {
            id: generateDeterministicUuidV7(ns, 20 + i),
            orderNumber: `BC3-CONFLICT-FAIL-${String.fromCharCode(65 + i)}`,
            userId: users[i].id,
            status: "CANCELLED",
            currency: "USD",
            subtotalAmount: 120000,
            taxAmount: 0,
            discountAmount: 0,
            shippingCost: 0,
            grandTotal: 120000,
            totalAmount: 120000,
          },
        });
      }
    });

    ctx.logger.info(
      "✓ Conflit résolu : 1 commande confirmée (stock=0), 2 rejetées.",
    );
    ctx.logger.end(this.name);
  },
};
</content>
