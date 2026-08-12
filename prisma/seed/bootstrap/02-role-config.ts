// prisma/seed/bootstrap/02-role-config.ts
// ============================================
// MAPPAGE RBAC LEVEL 1 -> LEVEL 7 (idempotent)
// ============================================
// Ce seeder exploite l'existant prisma/seed/role-config.seed.ts pour
// garantir la compatibilité avec l'application. Il injecte également
// RoleDefinition et RoleDefaultPermission.

import { Seeder } from "../types";
import { seedRoleConfigs } from "../role-config.seed";
import { buildRoleConfigSeeds } from "../shared/role-config";
import { generateUUIDv7 } from "../utils/uuid";

export const RoleConfigSeeder: Seeder = {
  name: "bootstrap:role-config",
  order: 30,
  async run(ctx) {
    ctx.logger.start(this.name);

    // 1. Réutiliser le seed existant (RoleConfig + RoleDefinition)
    await seedRoleConfigs(ctx.prisma);

    // 2. Injecter RoleDefinition pour chaque rôle (source coverage)
    for (const role of buildRoleConfigSeeds()) {
      await ctx.prisma.roleDefinition.upsert({
        where: { role: role.role },
        update: {
          level: role.level,
          name: role.role,
          description: role.description,
          permissions: role.permissions,
          restrictions: role.restrictions,
          isSystem: true,
          isActive: true,
        },
        create: {
          id: generateUUIDv7(),
          role: role.role,
          level: role.level,
          name: role.role,
          description: role.description,
          permissions: role.permissions,
          restrictions: role.restrictions,
          isSystem: true,
          isActive: true,
        },
      });
    }

    ctx.logger.info(`✓ RoleConfig levels 1-7 (${buildRoleConfigSeeds().length})`);
    ctx.logger.end(this.name);
  },
};