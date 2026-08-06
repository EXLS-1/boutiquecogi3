// prisma/seed/context.ts
// ============================================
// FACTORY DU SeedContext
// ============================================

import type { PrismaClient } from "@prisma/client";
import { SeedLogger } from "./logger";
import type { SeedContext, SeedEnvironment } from "./types";

export interface BuildContextOptions {
  prisma: PrismaClient;
  env?: SeedEnvironment;
  isVerbose?: boolean;
  seedNumber?: number;
  fixturesDir?: string;
}

/**
 * Construit un SeedContext validé à partir d'options.
 * Le NODE_ENV sert de source de vérité pour l'environnement.
 */
export function buildSeedContext(options: BuildContextOptions): SeedContext {
  const env: SeedEnvironment =
    options.env ??
    (process.env.NODE_ENV as SeedEnvironment) ??
    "development";

  if (!["development", "test", "production"].includes(env)) {
    throw new Error(`Environnement de seed invalide: ${env}`);
  }

  const logger = new SeedLogger(options.isVerbose ?? false);

  return {
    prisma: options.prisma,
    env,
    logger,
    isVerbose: options.isVerbose ?? false,
    seedNumber: options.seedNumber ?? 20260806,
    fixturesDir: options.fixturesDir ?? "prisma/seed/fixtures",
  };
}
