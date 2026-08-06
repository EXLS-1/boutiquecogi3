// prisma/seed/prod/index.ts
// ============================================
// REGISTRE PRODUCTION — DONNÉES DE RÉFÉRENCE SEULEMENT
// ============================================
// Exécuté uniquement en NODE_ENV=production. Ne crée AUCUNE donnée
// métier (clients, commandes, produits de démo). Uniquement des
// données de référence : Super Admin, catégories de base, modèles.

import { SeedRegistry } from "../types";
import { ProdSuperAdminSeeder } from "./01-super-admin";
import { ProdBaseCategoriesSeeder } from "./02-base-categories";
import { ProdNotificationTemplatesSeeder } from "./03-notification-templates";

export const prodRegistry: SeedRegistry = [
  ProdSuperAdminSeeder,
  ProdBaseCategoriesSeeder,
  ProdNotificationTemplatesSeeder,
];

