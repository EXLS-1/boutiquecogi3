// prisma/seed/dev/01-users.ts
// ============================================
// DÉVELOPPEMENT — UTILISATEURS & ADRESSES
// ============================================
// Crée des utilisateurs fictifs (admins, managers, clients) avec leurs
// comptes BetterAuth et leurs adresses RDC. Idempotent via upsert.

import { Seeder } from "../types";
import { buildUsersBatch } from "../factories/user.factory";
import { buildAddressFactory } from "../factories/address.factory";
import { generateUUIDv7 } from "../utils/uuid";

export const DevUsersSeeder: Seeder = {
  name: "dev:users",
  order: 10,
  async run(ctx) {
    ctx.logger.start(this.name);

    const users = await buildUsersBatch(50);

    const adminUserIds: string[] = [];

    for (const u of users) {
      // 1. Utilisateur
      const user = await ctx.prisma.user.upsert({
        where: { email: u.email },
        update: {
          name: u.name,
          emailVerified: u.emailVerified,
          roleConfig: { connect: { role: u.role } },
        },
        create: {
          id: u.id,
          name: u.name,
          email: u.email,
          emailVerified: u.emailVerified,
          roleConfig: { connect: { role: u.role } },
        },
      });

      // 2. Compte BetterAuth (credential)
      await ctx.prisma.account.upsert({
        where: {
          providerId_accountId: { providerId: "credential", accountId: u.id },
        },
        update: { password: u.account.password },
        create: {
          id: u.account.id,
          userId: user.id,
          type: "email",
          providerId: "credential",
          accountId: u.id,
          password: u.account.password,
        },
      });

      // 3. RoleAssignment (pour la hiérarchie RBAC)
      await ctx.prisma.roleAssignment.upsert({
        where: { userId: user.id },
        update: { role: u.role, isBlocked: false },
        create: {
          id: generateUUIDv7(),
          userId: user.id,
          role: u.role,
          roleId: generateUUIDv7(),
          isBlocked: false,
        },
      });

      // 4. Satellites 1:1
      await ctx.prisma.userPreferences.upsert({
        where: { userId: user.id },
        update: {},
        create: { id: generateUUIDv7(), userId: user.id, language: "fr", theme: "light", notifications: {} },
      });
      await ctx.prisma.userSecurity.upsert({
        where: { userId: user.id },
        update: {},
        create: { id: generateUUIDv7(), userId: user.id, twoFactorEnabled: false, isBlocked: false },
      });
      await ctx.prisma.userQuota.upsert({
        where: { userId: user.id },
        update: {},
        create: { id: generateUUIDv7(), userId: user.id, productCount: 0 },
      });
      await ctx.prisma.userAudit.upsert({
        where: { userId: user.id },
        update: {},
        create: { id: generateUUIDv7(), userId: user.id, isDeleted: false, version: 1 },
      });

      // 5. Adresse (pour les clients)
      if (u.roleLevel >= 5) {
        // Clients (USER/SUPERVISOR) ont une adresse
        const addr = buildAddressFactory(u.id.length, user.id, ctx.seedNumber);
        await ctx.prisma.address.upsert({
          where: { id: addr.id },
          update: { street: addr.street, commune: addr.commune, isDefault: addr.isDefault },
          create: {
            id: addr.id,
            userId: user.id,
            label: addr.label,
            street: addr.street,
            commune: addr.commune,
            city: addr.city,
            country: addr.country,
            phone: addr.phone,
            isDefault: addr.isDefault,
          },
        });
      }

      if (u.roleLevel <= 4) adminUserIds.push(user.id);
    }

    ctx.logger.info(`✓ Users (${users.length}) + Adresses RDC`);
    ctx.logger.end(this.name);
  },
};