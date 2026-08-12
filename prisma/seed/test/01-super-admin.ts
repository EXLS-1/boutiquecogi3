// prisma/seed/test/01-super-admin.ts
// ============================================
// TEST — SUPER ADMIN UNIQUE (DÉTERMINISTE)
// ============================================
// Compte unique pour les suites de test RBAC. Idempotent.
// Aucun Faker aléatoire — IDs déterministes pour reproductibilité.

import { Seeder } from "../types";
import { generateDeterministicUuidV7 } from "../utils/uuid";
import { getStaticPasswordHash } from "../utils/hash";

export const TestSuperAdminSeeder: Seeder = {
  name: "test:super-admin",
  order: 10,
  async run(ctx) {
    ctx.logger.start(this.name);

    const email = "superadmin.test@boutiquecogi3.cd";
    const userId = generateDeterministicUuidV7("test-super-admin", 0);
    const passwordHash = await getStaticPasswordHash("TestSuperAdmin123!");

    // 1. Utilisateur
    const user = await ctx.prisma.user.upsert({
      where: { email },
      update: { name: "SuperAdmin Test", emailVerified: true, roleConfig: { connect: { role: "SUPER_ADMIN" } } },
      create: {
        id: userId,
        name: "SuperAdmin Test",
        email,
        emailVerified: true,
        roleConfig: { connect: { role: "SUPER_ADMIN" } },
      },
    });

    // 2. Compte BetterAuth
    await ctx.prisma.account.upsert({
      where: { providerId_accountId: { providerId: "credential", accountId: user.id } },
      update: { password: passwordHash },
      create: {
        id: generateDeterministicUuidV7("test-super-admin-account", 0),
        userId: user.id,
        type: "email",
        providerId: "credential",
        accountId: user.id,
        password: passwordHash,
      },
    });

    // 3. RoleAssignment
    await ctx.prisma.roleAssignment.upsert({
      where: { userId: user.id },
      update: { role: "SUPER_ADMIN", isBlocked: false },
      create: {
        id: generateDeterministicUuidV7("test-super-admin-ra", 0),
        userId: user.id,
        role: "SUPER_ADMIN",
        roleId: generateDeterministicUuidV7("test-super-admin-rd", 0),
      },
    });

    // 4. Satellites
    await ctx.prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: {},
      create: { id: generateDeterministicUuidV7("test-super-admin-pref", 0), userId: user.id },
    });

    ctx.logger.info(`✓ SuperAdmin test: ${email}`);
    ctx.logger.end(this.name);
  },
};