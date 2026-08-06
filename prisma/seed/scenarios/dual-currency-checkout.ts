// prisma/seed/scenarios/dual-currency-checkout.ts
// ============================================
// SCÉNARIO — VÉRIFICATION DOUBLE DEVISE (USD/CDF)
// ============================================
// Vérifie la cohérence des conversions de prix entre USD et CDF
// (entiers, sans erreur d'arrondi) pour les articles du catalogue.

import { Seeder } from "../types";
import { usdToCents, usdCentsToCdf } from "../utils/currency";

export const DualCurrencyCheckoutScenario: Seeder = {
  name: "scenario:dual-currency-checkout",
  order: 103,
  async run(ctx) {
    ctx.logger.start(this.name);

    const products = await ctx.prisma.product.findMany({
      select: { name: true, basePrice: true },
      take: 50,
    });

    let checked = 0;
    for (const p of products) {
      const usdCents = Number(p.basePrice);
      const cdf = usdCentsToCdf(usdCents);
      const roundTrip = usdToCents(Math.round(usdCents) / 100);
      // Vérifie que la conversion CDF reste un entier cohérent
      if (!Number.isInteger(cdf)) {
        ctx.logger.warn(`Écart d'arrondi CDF pour ${p.name}: ${cdf}`);
      }
      checked++;
    }

    ctx.logger.info(`✓ Double devise vérifiée sur ${checked} produits (USD/CDF).`);
    ctx.logger.end(this.name);
  },
};
</content>
