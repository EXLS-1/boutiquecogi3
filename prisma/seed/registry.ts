// prisma/seed/registry.ts
// ============================================
// REGISTRES D'EXÉCUTION PAR ENVIRONNEMENT + SCÉNARIOS
// ============================================
// Importe les registres de chaque couche (bootstrap, dev, test, prod,
// scenarios) et expose un helper pour sélectionner les seeds adaptés
// au NODE_ENV courant.

import type { SeedContext, SeedEnvironment, SeedRegistry } from "./types";
import { bootstrapRegistry } from "./bootstrap";
import { devRegistry } from "./dev";
import { testRegistry } from "./test";
import { prodRegistry } from "./prod";
import { scenariosRegistry } from "./scenarios";

/** Registres par environnement. Toujours précédé du bootstrap. */
export const ENV_REGISTRIES: Record<
  SeedEnvironment,
  { env: SeedEnvironment; registry: SeedRegistry }
> = {
  development: { env: "development", registry: devRegistry },
  test: { env: "test", registry: testRegistry },
  production: { env: "production", registry: prodRegistry },
};

/** Registre de scénarios (exécutés à la demande via CLI flag). */
export const ALL_SCENARIOS: SeedRegistry = scenariosRegistry;

/**
 * Sélectionne les registres à exécuter pour l'environnement donné.
 * Retourne [bootstrap, envRegistry].
 */
export function selectRegistries(
  env: SeedEnvironment,
): { bootstrap: SeedRegistry; env: SeedRegistry } {
  const envRegistry = ENV_REGISTRIES[env]?.registry ?? devRegistry;
  return { bootstrap: bootstrapRegistry, env: envRegistry };
}

/**
 * Exécute une liste de seeders dans l'ordre croissant de `order`.
 * Gère les erreurs par seeder (log + throw) pour un arrêt propre.
 */
export async function runSeeders(
  ctx: SeedContext,
  seeders: SeedRegistry,
): Promise<void> {
  const sorted = [...seeders].sort((a, b) => a.order - b.order);

  for (const seeder of sorted) {
    try {
      await seeder.run(ctx);
    } catch (err) {
      ctx.logger.error(`Échec du seeder '${seeder.name}'`, err);
      throw err;
    }
  }
}
</content>
