// prisma/seed/dev/06-coupons.ts
// ============================================
// DÉVELOPPEMENT — CODES PROMO & RÈGLES DE RÉDUCTION
// ============================================
// Crée des coupons actifs et expirés via la factory. Idempotent.

import { Seeder } from "../types";
import { buildCouponsBatch } from "../factories/coupon.factory";

export const DevCouponsSeeder: Seeder = {
  name: "dev:coupons",
  order: 60,
  async run(ctx) {
    ctx.logger.start(this.name);

    const coupons = buildCouponsBatch(10, ctx.seedNumber);

    for (const c of coupons) {
      await ctx.prisma.coupon.upsert({
        where: { code: c.code },
        update: {
          discountType: c.discountType,
          discountValue: c.discountValue,
          minOrderValue: c.minOrderValue,
          expiresAt: c.expiresAt,
          isActive: c.isActive,
          usageLimit: c.usageLimit,
        },
        create: {
          id: c.id,
          code: c.code,
          discountType: c.discountType,
          discountValue: c.discountValue,
          minOrderValue: c.minOrderValue,
          expiresAt: c.expiresAt,
          isActive: c.isActive,
          usageLimit: c.usageLimit,
        },
      });
    }

    ctx.logger.info(`✓ Coupons (${coupons.length})`);
    ctx.logger.end(this.name);
  },
};
</content>
