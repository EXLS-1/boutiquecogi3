// prisma/seed/bootstrap/00-system-config.ts
// ============================================
// PARAMÈTRES SYSTÈME GLOBAUX (idempotent)
// ============================================
// Injecte les clés de configuration système dans SystemConfiguration
// et le taux de change initial dans AppConfig / ExchangeRate.

import { Seeder } from "../types";
import { SYSTEM_UUIDS } from "../common/constants";
import { SEED_EXCHANGE_RATE_USD_CDF } from "../shared/currencies";
import { generateUUIDv7 } from "../utils/uuid";

const SYSTEM_CONFIG = [
  { key: "store.name", value: "BoutiqueCOGI3" },
  { key: "store.currency", value: "USD" },
  { key: "store.country", value: "RDC" },
  { key: "store.city", value: "Kinshasa" },
  { key: "exchange.rate", value: String(SEED_EXCHANGE_RATE_USD_CDF) },
  { key: "exchange.rate.source", value: "seed-bootstrap" },
  { key: "catalog.pageSize", value: "24" },
] as const;

export const SystemConfigSeeder: Seeder = {
  name: "bootstrap:system-config",
  order: 10,
  async run(ctx) {
    ctx.logger.start(this.name);

    // SystemConfiguration (clé/valeur)
    for (const item of SYSTEM_CONFIG) {
      await ctx.prisma.systemConfiguration.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: { id: generateUUIDv7(), key: item.key, value: item.value },
      });
    }

    // AppConfig (taux de change)
    await ctx.prisma.appConfig.upsert({
      where: { id: "00000000-0000-4000-8000-000000000099" },
      update: {
        usdToCdfRate: SEED_EXCHANGE_RATE_USD_CDF,
        exchangeRateSource: "seed-bootstrap",
        exchangeRateUpdatedAt: new Date(),
      },
      create: {
        id: "00000000-0000-4000-8000-000000000099",
        usdToCdfRate: SEED_EXCHANGE_RATE_USD_CDF,
        exchangeRateSource: "seed-bootstrap",
        exchangeRateUpdatedAt: new Date(),
      },
    });

    // ExchangeRate (table séparée)
    await ctx.prisma.exchangeRate.upsert({
      where: { id: SYSTEM_UUIDS.SHIPPING_KINSHASA },
      update: { rate: SEED_EXCHANGE_RATE_USD_CDF, source: "seed-bootstrap" },
      create: {
        id: SYSTEM_UUIDS.SHIPPING_KINSHASA,
        baseCurrency: "USD",
        quoteCurrency: "CDF",
        rate: SEED_EXCHANGE_RATE_USD_CDF,
        source: "seed-bootstrap",
        effectiveAt: new Date(),
      },
    });

    ctx.logger.info(
      `✓ SystemConfig (${SYSTEM_CONFIG.length} clés) + devise USD/CDF`,
    );
    ctx.logger.end(this.name);
  },
};
</content>
