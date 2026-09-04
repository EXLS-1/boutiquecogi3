// prisma/seed/test/04-deterministic-data.ts
// ============================================
// TEST — FIXTURES À IDS FIXES POUR E2E
// ============================================
// 1 coupon, 2 commandes, 1 panier, 1 wishlist avec IDs déterministes.

import { Seeder } from "../types";
import { generateDeterministicUuidV7 } from "../utils/uuid";

export const TestDeterministicDataSeeder: Seeder = {
  name: "test:deterministic-data",
  order: 40,
  async run(ctx) {
    ctx.logger.start(this.name);

    // Récupérer un user test, un produit/variante
    const user = await ctx.prisma.user.findFirst({
      where: { roleAssignment: { roleConfig: { role: "USER" } } },
      select: { id: true },
    });
    const product = await ctx.prisma.product.findFirst({ select: { id: true } });
    const variant = await ctx.prisma.productVariant.findFirst({ select: { id: true, productId: true } });

    if (!user || !product || !variant) {
      ctx.logger.warn("Données préalables manquantes — exécuter les seeds précédents.");
      return;
    }

    // 1. Coupon
    await ctx.prisma.coupon.upsert({
      where: { code: "TEST10" },
      update: { isActive: true },
      create: {
        id: generateDeterministicUuidV7("test-coupon", 0),
        code: "TEST10",
        discountType: "PERCENTAGE",
        discountValue: 10,
        expiresAt: new Date(Date.now() + 86400000 * 30),
        isActive: true,
      },
    });

    // 2. Deux commandes
    const orders = [
      { number: "TEST-ORDER-1", status: "PENDING" as const, total: 2500 },
      { number: "TEST-ORDER-2", status: "DELIVERED" as const, total: 5000 },
    ];

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      const order = await ctx.prisma.order.upsert({
        where: { orderNumber: o.number },
        update: { status: o.status },
        create: {
          id: generateDeterministicUuidV7("test-order", i),
          orderNumber: o.number,
          userId: user.id,
          status: o.status,
          currency: "USD",
          subtotalAmount: o.total,
          taxAmount: 0,
          discountAmount: 0,
          shippingCost: 0,
          grandTotal: o.total,
          totalAmount: o.total,
        },
      });

      // Item
      await ctx.prisma.orderItem.create({
        data: {
          id: generateDeterministicUuidV7("test-order-item", i),
          orderId: order.id,
          productId: product.id,
          variantId: variant.id,
          productName: "Produit Test",
          variantSku: variant.id,
          quantity: 1,
          unitPrice: o.total,
          subtotal: o.total,
          currency: "USD",
        },
      });
    }

    // 3. Un panier
    const cart = await ctx.prisma.cart.upsert({
      where: { userId: user.id },
      update: { expiresAt: new Date(Date.now() + 86400000) },
      create: {
        id: generateDeterministicUuidV7("test-cart", 0),
        userId: user.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    await ctx.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
      update: { quantity: 1 },
      create: {
        id: generateDeterministicUuidV7("test-cart-item", 0),
        cartId: cart.id,
        variantId: variant.id,
        quantity: 1,
      },
    });

    // 4. Une wishlist
    const wishlist = await ctx.prisma.wishlist.upsert({
      where: { userId: user.id },
      update: {},
      create: { id: generateDeterministicUuidV7("test-wishlist", 0), userId: user.id },
    });

    await ctx.prisma.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId: product.id } },
      update: {},
      create: {
        id: generateDeterministicUuidV7("test-wishlist-item", 0),
        wishlistId: wishlist.id,
        productId: product.id,
      },
    });

    ctx.logger.info("✓ Deterministic data (coupon, 2 commandes, panier, wishlist)");
    ctx.logger.end(this.name);
  },
};