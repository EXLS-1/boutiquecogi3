// prisma/seed/dev/10-reviews.ts
// ============================================
// DÉVELOPPEMENT — ÉVALUATIONS PRODUITS
// ============================================
// Génère des avis clients déterminés via la factory review.
// Idempotent via unique [productId, userId].

import { Seeder } from "../types";
import { buildReviewFactory } from "../factories/review.factory";

export const DevReviewsSeeder: Seeder = {
  name: "dev:reviews",
  order: 100,
  async run(ctx) {
    ctx.logger.start(this.name);

    const users = await ctx.prisma.user.findMany({
      where: { roleAssignment: { role: "USER" } },
      select: { id: true },
      take: 30,
    });
    const products = await ctx.prisma.product.findMany({
      select: { id: true },
      take: 40,
    });

    if (users.length === 0 || products.length === 0) {
      ctx.logger.warn("Pas assez d'utilisateurs/produits — exécuter les seeds précédents.");
      return;
    }

    let reviewCount = 0;

    for (let i = 0; i < 60; i++) {
      const r = buildReviewFactory(
        i,
        products[i % products.length].id,
        users[i % users.length].id,
        ctx.seedNumber,
      );
      await ctx.prisma.review.upsert({
        where: { productId_userId: { productId: r.productId, userId: r.userId } },
        update: { rating: r.rating, comment: r.comment, isVerifiedPurchase: r.isVerifiedPurchase },
        create: {
          id: r.id,
          productId: r.productId,
          userId: r.userId,
          rating: r.rating,
          comment: r.comment,
          isVerifiedPurchase: r.isVerifiedPurchase,
        },
      });
      reviewCount++;
    }

    ctx.logger.info(`✓ Reviews (${reviewCount})`);
    ctx.logger.end(this.name);
  },
};
</content>
