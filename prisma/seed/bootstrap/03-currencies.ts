// prisma/seed/bootstrap/03-currencies.ts
// ============================================
// DEVISE USD / CDF + TAUX DE CONVERSION (idempotent)
// ============================================
// Injecte les devises dans ProductPrice (via configuration) et garantit
// que le taux de change est présent pour les calculs multi-devise.

import { Seeder } from "../types";
import { CURRENCIES, SEED_EXCHANGE_RATE_USD_CDF } from "../shared/currencies";
import { generateUUIDv7 } from "../utils/uuid";

export const CurrenciesSeeder: Seeder = {
  name: "bootstrap:currencies",
  order: 40,
  async run(ctx) {
    ctx.logger.start(this.name);

    // AppConfig sert de registre des devises supportées via system configuration
    for (const currency of CURRENCIES) {
      await ctx.prisma.systemConfiguration.upsert({
        where: { key: `currency.${currency.code}` },
        update: {
          value: JSON.stringify({
            symbol: currency.symbol,
            decimals: currency.decimals,
            rateToUsd: currency.rateToUsd,
            isDefault: currency.isDefault,
          }),
        },
        create: {
          id: generateUUIDv7(),
          key: `currency.${currency.code}`,
          value: JSON.stringify({
            symbol: currency.symbol,
            decimals: currency.decimals,
            rateToUsd: currency.rateToUsd,
            isDefault: currency.isDefault,
          }),
        },
      });
    }

    // Garantir la présence du taux USD/CDF dans AppConfig
    await ctx.prisma.appConfig.upsert({
      where: { id: "00000000-0000-4000-8000-000000000099" },
      update: { usdToCdfRate: SEED_EXCHANGE_RATE_USD_CDF, exchangeRateSource: "seed-bootstrap" },
      create: {
        id: "00000000-0000-4000-8000-000000000099",
        usdToCdfRate: SEED_EXCHANGE_RATE_USD_CDF,
        exchangeRateSource: "seed-bootstrap",
      },
    });

    ctx.logger.info(`✓ Currencies (${CURRENCIES.length}) USD/CDF @ ${SEED_EXCHANGE_RATE_USD_CDF}`);
    ctx.logger.end(this.name);
  },
};
</content>
