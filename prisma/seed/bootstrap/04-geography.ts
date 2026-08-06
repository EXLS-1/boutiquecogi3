// prisma/seed/bootstrap/04-geography.ts
// ============================================
// VILLES & PROVINCES RDC POUR LIVRAISONS (idempotent)
// ============================================
// Les villes/provinces sont stockées dans SystemConfiguration pour
// alimenter les dropdowns de livraison sans table dédiée.

import { Seeder } from "../types";
import { DRC_PROVINCES, SUPPORTED_CITIES } from "../shared/drc-geography";
import { generateUUIDv7 } from "../utils/uuid";

export const GeographySeeder: Seeder = {
  name: "bootstrap:geography",
  order: 50,
  async run(ctx) {
    ctx.logger.start(this.name);

    // Injecter les provinces dans SystemConfiguration
    await ctx.prisma.systemConfiguration.upsert({
      where: { key: "geography.provinces" },
      update: { value: JSON.stringify(DRC_PROVINCES) },
      create: {
        id: generateUUIDv7(),
        key: "geography.provinces",
        value: JSON.stringify(DRC_PROVINCES),
      },
    });

    // Injecter les villes de livraison supportées
    await ctx.prisma.systemConfiguration.upsert({
      where: { key: "geography.supportedCities" },
      update: { value: JSON.stringify(SUPPORTED_CITIES) },
      create: {
        id: generateUUIDv7(),
        key: "geography.supportedCities",
        value: JSON.stringify(SUPPORTED_CITIES),
      },
    });

    ctx.logger.info(
      `✓ Geography (${DRC_PROVINCES.length} provinces, ${Object.keys(SUPPORTED_CITIES).length} villes supportées)`,
    );
    ctx.logger.end(this.name);
  },
};
</content>
