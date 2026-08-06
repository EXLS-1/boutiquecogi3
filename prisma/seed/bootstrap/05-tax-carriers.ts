// prisma/seed/bootstrap/05-tax-carriers.ts
// ============================================
// TAXES LOCALES & TRANSPORTEURS (idempotent)
// ============================================
// Injecte les classes de taxe, les transporteurs et les méthodes de
// livraison de base (Kinshasa delivery).

import { Seeder } from "../types";
import { generateUUIDv7 } from "../utils/uuid";
import { SYSTEM_UUIDS } from "../common/constants";

export const TaxCarriersSeeder: Seeder = {
  name: "bootstrap:tax-carriers",
  order: 60,
  async run(ctx) {
    ctx.logger.start(this.name);

    // 1. Transporteur Kinshasa
    await ctx.prisma.carrier.upsert({
      where: { code: "KIN-EXPRESS" },
      update: { name: "BoutiqueCOGI3 Express Kinshasa", isActive: true },
      create: {
        id: SYSTEM_UUIDS.CARRIER_KINSHASA,
        name: "BoutiqueCOGI3 Express Kinshasa",
        code: "KIN-EXPRESS",
        contact: "+243800000001",
        isActive: true,
      },
    });

    // 2. Méthode de livraison standard
    await ctx.prisma.shippingMethod.upsert({
      where: { id: SYSTEM_UUIDS.SHIPPING_KINSHASA },
      update: {
        name: "Livraison standard Kinshasa",
        description: "Livraison sécurisée en 2 à 5 jours ouvrés",
        price: 500,
        isActive: true,
        carrier: "KIN-EXPRESS",
        estimatedDays: "2-5",
      },
      create: {
        id: SYSTEM_UUIDS.SHIPPING_KINSHASA,
        name: "Livraison standard Kinshasa",
        description: "Livraison sécurisée en 2 à 5 jours ouvrés",
        price: 500,
        isActive: true,
        carrier: "KIN-EXPRESS",
        estimatedDays: "2-5",
      },
    });

    // 3. Classe de taxe par défaut (TVA 16% RDC)
    await ctx.prisma.taxClass.upsert({
      where: { name: "STANDARD" },
      update: { description: "Taxe standard RDC (TVA 16%)" },
      create: {
        id: SYSTEM_UUIDS.TAX_DEFAULT,
        name: "STANDARD",
        description: "Taxe standard RDC (TVA 16%)",
      },
    });

    // Taux de taxe pour RDC
    const taxClass = await ctx.prisma.taxClass.findUnique({
      where: { name: "STANDARD" },
    });
    if (taxClass) {
      await ctx.prisma.taxRate.upsert({
        where: {
          taxClassId_country_region: {
            taxClassId: taxClass.id,
            country: "RDC",
            region: "",
          },
        },
        update: { rate: 0.16 },
        create: {
          id: generateUUIDv7(),
          taxClassId: taxClass.id,
          country: "RDC",
          region: "",
          rate: 0.16,
        },
      });
    }

    ctx.logger.info("✓ TaxClass STANDARD (16%) + Transporteur KIN-EXPRESS");
    ctx.logger.end(this.name);
  },
};
</content>
