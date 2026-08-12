// prisma/seed/test/index.ts
// ============================================
// REGISTRE TEST — DONNÉES MINIMALES DÉTERMINISTES
// ============================================
// Exécuté uniquement en NODE_ENV=test. Rapide, reproductible,
// aucun Faker aléatoire.

import { SeedRegistry } from "../types";
import { TestSuperAdminSeeder } from "./01-super-admin";
import { TestMinimalUsersSeeder } from "./02-minimal-users";
import { TestMinimalCatalogSeeder } from "./03-minimal-catalog";
import { TestDeterministicDataSeeder } from "./04-deterministic-data";

export const testRegistry: SeedRegistry = [
  TestSuperAdminSeeder,
  TestMinimalUsersSeeder,
  TestMinimalCatalogSeeder,
  TestDeterministicDataSeeder,
];