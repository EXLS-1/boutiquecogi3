// prisma/seed/bootstrap/index.ts
// ============================================
// REGISTRE BOOTSTRAP — EXÉCUTÉ DANS TOUS LES ENVIRONNEMENTS
// ============================================
// Données d'infrastructure indispensables au démarrage de l'application :
// permissions, rôles, configuration système, devises, taxes, transporteurs.

import { SeedRegistry } from "../types";
import { SystemConfigSeeder } from "./00-system-config";
import { PermissionsSeeder } from "./01-permissions";
import { RoleConfigSeeder } from "./02-role-config";
import { CurrenciesSeeder } from "./03-currencies";
import { GeographySeeder } from "./04-geography";
import { TaxCarriersSeeder } from "./05-tax-carriers";

export const bootstrapRegistry: SeedRegistry = [
  SystemConfigSeeder,
  PermissionsSeeder,
  RoleConfigSeeder,
  CurrenciesSeeder,
  GeographySeeder,
  TaxCarriersSeeder,
];