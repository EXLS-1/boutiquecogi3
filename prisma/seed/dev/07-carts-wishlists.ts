// prisma/seed/dev/07-carts-wishlists.ts
// ============================================
// DÉVELOPPEMENT — PANIERS & LISTES DE SOUHAITS
// ============================================
// Crée des paniers (dont abandonnés) et des wishlists pour les clients.
// Idempotent.

import { Seeder } from "../types";
import { generateUUIDv7 } from "../utils/uuid";

export const DevCartsWishlistsSeeder: Seeder = {
  name: "dev:carts-wishlists",
  order: 70,
  async run(ctx) {
    ctx.logger.start(this.name);

    // Récupérer les clients (role USER) et les variantes
    const users = await ctx.prisma.user.findMany({
      where: { roleAssignment: { role: "USER" } },
      select: { id: true },
      take: 30,
    });
    const variants = await ctx.prisma.productVariant.findMany({
      select: { id: true },
      take: 60,
    });

    if (users.length === 0 || variants.length === 0) {
      ctx.logger.warn("Pas assez d'utilisateurs/variantes — exécuter les seeds précédents.");
      return;
    }

    let cartCount = 0;
    let wishlistCount = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      // 1. Wishlist + 5 items
      const wishlist = await ctx.prisma.wishlist.upsert({
        where: { userId: user.id },
        update: {},
        create: { id: generateUUIDv7(), userId: user.id },
      });
      wishlistCount++;

      for (let w = 0; w < 5; w++) {
        const variant = variants[(i + w) % variants.length];
        const product = await ctx.prisma.productVariant.findUnique({
          where: { id: variant.id },
          select: { productId: true },
        });
        if (!product) continue;
        await ctx.prisma.wishlistItem.upsert({
          where: {
            wishlistId_productId: { wishlistId: wishlist.id, productId: product.productId },
          },
          update: {},
          create: { id: generateUUIDv7(), wishlistId: wishlist.id, productId: product.productId },
        });
      }

      // 2. Panier + items (pour 70% des clients)
      if (i % 10 < 7) {
        const cart = await ctx.prisma.cart.upsert({
          where: { userId: user.id },
          update: { expiresAt: new Date(Date.now() + 86400000) },
          create: {
            id: generateUUIDv7(),
            userId: user.id,
            expiresAt: new Date(Date.now() + 86400000),
          },
        });
        cartCount++;

        for (let c = 0; c < 3; c++) {
          const variant = variants[(i * 2 + c) % variants.length];
          await ctx.prisma.cartItem.upsert({
            where: {
              cartId_variantId: { cartId: cart.id, variantId: variant.id },
            },
            update: { quantity: (c % 2) + 1 },
            create: {
              id: generateUUIDv7(),
              cartId: cart.id,
              variantId: variant.id,
              quantity: (c % 2) + 1,
            },
          });
        }

        // Panier abandonné pour la moitié
        if (i % 2 === 0) {
          await ctx.prisma.abandonedCart.upsert({
            where: { cartId: cart.id },
            update: {
              expiresAt: new Date(Date.now() + 86400000),
              updatedAt: new Date(),
            },
            create: {
              id: generateUUIDv7(),
              cartId: cart.id,
              userId: user.id,
              expiresAt: new Date(Date.now() + 86400000),
              updatedAt: new Date(),
            },
          });
        }
      }
    }

    ctx.logger.info(`✓ Carts (${cartCount}) + Wishlists (${wishlistCount})`);
    ctx.logger.end(this.name);
  },
};