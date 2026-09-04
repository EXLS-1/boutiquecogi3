// prisma/seed/bootstrap/02-role-config.ts
// ============================================
// MAPPAGE RBAC LEVEL 1 -> LEVEL 7 (idempotent)
// ============================================
// Ce seeder exploite l'existant prisma/seed/role-config.seed.ts pour
// garantir la compatibilité avec l'application (il injecte RoleConfig).
// L'ancien `RoleDefinition` est supprimé : la logique vit désormais dans RoleConfig.

import { Seeder } from "../types";
import { seedRoleConfigs } from "../role-config.seed";
import { buildRoleConfigSeeds } from "../shared/role-config";

export const RoleConfigSeeder: Seeder = {
  name: "bootstrap:role-config",
  order: 30,
  async run(ctx) {
    ctx.logger.start(this.name);

    // 1. Réutiliser le seed existant (RoleConfig)
    await seedRoleConfigs(ctx.prisma);

    ctx.logger.info(`✓ RoleConfig levels 1-7 (${buildRoleConfigSeeds().length})`);
    ctx.logger.end(this.name);
  },
};