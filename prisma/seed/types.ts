// prisma/seed/types.ts
// ============================================
// TYPES & CONTRATS COMMUNS DE L'ARCHITECTURE SEED
// ============================================
// Ce fichier définit les contrats fondamentaux partagés par tous les
// modules de seed (bootstrap, dev, test, prod, scenarios).
// Il corrige l'import cassé dans prod/index.ts (qui référençait ../types).

import type { PrismaClient } from "@prisma/client";
import type { SeedLogger } from "./logger";

export type SeedEnvironment = "development" | "test" | "production";

/**
 * Contexte transmis à chaque seeder.
 * Garantit la transmission sécurisée de l'instance Prisma et du logger
 * sans instanciations multiples.
 */
export interface SeedContext {
  prisma: PrismaClient;
  env: SeedEnvironment;
  logger: SeedLogger;
  isVerbose: boolean;
  /** Seed fixe pour rendre Faker / PRNG 100% déterministe. */
  seedNumber: number;
  /** Chemin du dossier fixtures (JSON) ; surchargeable par argument CLI. */
  fixturesDir: string;
}

/**
 * Contrat standard que chaque module de seed doit respecter.
 * Le registre (registry.ts) trie puis exécute la liste dans l'ordre.
 */
export interface Seeder {
  readonly name: string;
  readonly order: number;
  readonly dependencies?: string[];
  run(ctx: SeedContext): Promise<void>;
}

export type SeedRegistry = Seeder[];
