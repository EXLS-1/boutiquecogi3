// prisma/seed/bootstrap/01-permissions.ts
// ============================================
// INJECTION DES PERMISSIONS FINES (idempotent)
// ============================================
// Injecte les permissions dans la table `Permission`, puis les
// relations RolePermission pour chaque rôle.

import { Seeder } from "../types";
import { buildPermissionSeeds } from "../shared/permissions";
import { buildRoleConfigSeeds } from "../shared/role-config";
import { generateUUIDv7 } from "../utils/uuid";

export const PermissionsSeeder: Seeder = {
  name: "bootstrap:permissions",
  order: 20,
  async run(ctx) {
    ctx.logger.start(this.name);

    const permissionSeeds = buildPermissionSeeds();
    const roleConfigs = buildRoleConfigSeeds();

    // 1. Upsert toutes les permissions
    for (const perm of permissionSeeds) {
      await ctx.prisma.permission.upsert({
        where: { code: perm.code },
        update: {
          name: perm.name,
          description: perm.description,
          category: perm.category,
          isDangerous: perm.isDangerous,
        },
        create: {
          id: generateUUIDv7(),
          code: perm.code,
          name: perm.name,
          description: perm.description,
          category: perm.category,
          isDangerous: perm.isDangerous,
        },
      });
    }

    // 2. Pour chaque rôle, attacher les permissions ON via RolePermission
    for (const role of roleConfigs) {
      const roleConfig = await ctx.prisma.roleConfig.upsert({
        where: { role: role.role },
        update: {
          level: role.level,
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
          description: role.description,
          permissions: role.permissions,
          restrictions: role.restrictions,
          isSystem: true,
          isActive: true,
        },
      });

      // Trouver les permissions ON pour ce rôle
      const grantedCodes = Object.entries(role.permissions)
        .filter(([, state]) => state === "ON")
        .map(([code]) => code);

      for (const code of grantedCodes) {
        const permission = await ctx.prisma.permission.findUnique({
          where: { code },
        });
        if (!permission) continue;

        await ctx.prisma.rolePermission.upsert({
          where: {
            roleconfigId_permissionId: {
              roleconfigId: roleConfig.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            id: generateUUIDv7(),
            roleId: role.role,
            roleconfigId: roleConfig.id,
            permissionId: permission.id,
          },
        });
      }
    }

    ctx.logger.info(
      `✓ Permissions (${permissionSeeds.length}) + RolePermission (${roleConfigs.length} rôles)`,
    );
    ctx.logger.end(this.name);
  },
};
</content>
