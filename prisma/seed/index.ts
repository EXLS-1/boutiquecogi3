// prisma/seed/index.ts
// ============================================
// ORCHESTRATEUR PRINCIPAL — POINT D'ENTRÉE UNIQUE
// ============================================
// Orchestre les registres selon l'environnement (NODE_ENV) :
//   1. Bootstrap (toujours exécuté : permissions, rôles, config système)
//   2. Registre spécifique à l'environnement (dev / test / prod)
//   3. Scénarios (optionnels, à la demande via --scenario=<name>)
//
// Une seule commande Prisma suffit : `prisma db seed`.

import type { PrismaClient } from "@prisma/client";
import { buildSeedContext } from "./context";
import { runSeeders, selectRegistries, ALL_SCENARIOS } from "./registry";
import type { SeedContext } from "./types";

export async function main(client: PrismaClient) {
  const args = process.argv.slice(2);

  // Flags CLI : --verbose, --scenario=<name>
  const isVerbose = args.includes("--verbose");
  const scenarioFlag = args.find((a) => a.startsWith("--scenario="));
  const scenarioName = scenarioFlag?.split("=")[1];

  const ctx: SeedContext = buildSeedContext({
    prisma: client,
    isVerbose,
  });
  const env = ctx.env;
  const logger = ctx.logger;

  const startTime = performance.now();
  logger.section(`🚀 Seed BoutiqueCOGI3 [ENV: ${env.toUpperCase()}]`);

  try {
    // Phase 1 : Bootstrap (toujours)
    logger.section("Phase 1 — Bootstrap system");
    const { bootstrap, env: envRegistry } = selectRegistries(env);
    await runSeeders(ctx, bootstrap);

    // Phase 2 : Registre environnement
    logger.section(`Phase 2 — ${env} seeds`);
    await runSeeders(ctx, envRegistry);

    // Phase 3 : Scénario (optionnel)
    if (scenarioName) {
      const scenario = ALL_SCENARIOS.find((s) => s.name === scenarioName);
      if (!scenario) {
        throw new Error(`Scénario inconnu: ${scenarioName}`);
      }
      logger.section(`Phase 3 — Scénario: ${scenario.name}`);
      await runSeeders(ctx, [scenario]);
    }

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    logger.success(`✅ Seed terminé en ${duration}s [${env}]`);
  } catch (err) {
    logger.error("❌ Seed échoué", err);
    throw err;
  }
}

