// prisma/seed/test/02-minimal-users.ts
// ============================================
// TEST — 1 ADMIN + 2 USERS STANDARD (DÉTERMINISTE)
// ============================================
// Petit jeu de données pour les tests React/API. IDs fixes.

import { Seeder } from "../types";
import { generateDeterministicUuidV7 } from "../utils/uuid";
import { getStaticPasswordHash } from "../utils/hash";

const USERS = [
  { email: "admin.test@boutiquecogi3.cd", name: "Admin Test", role: "ADMIN" as const, level: 2 },
  { email: "user1.test@boutiquecogi3.cd", name: "User Test 1", role: "USER" as const, level: 6 },
  { email: "user2.test@boutiquecogi3.cd", name: "User Test 2", role: "USER" as const, level: 6 },
];

export const TestMinimalUsersSeeder: Seeder = {
  name: "test:minimal-users",
  order: 20,
  async run(ctx) {
    ctx.logger.start(this.name);

    const passwordHash = await getStaticPasswordHash("TestUser123!");

    for (let i = 0; i < USERS.length; i++) {
      const u = USERS[i];
      const userId = generateDeterministicUuidV7("test-user", i + 1);

      const user = await ctx.prisma.user.upsert({
        where: { email: u.email },
        update: { name: u.name, emailVerified: true, roleConfig: { connect: { role: u.role } } },
        create: {
          id: userId,
          name: u.name,
          email: u.email,
          emailVerified: true,
          roleConfig: { connect: { role: u.role } },
        },
      });

      await ctx.prisma.account.upsert({
        where: { providerId_accountId: { providerId: "credential", accountId: user.id } },
        update: { password: passwordHash },
        create: {
          id: generateDeterministicUuidV7("test-user-account", i + 1),
          userId: user.id,
          type: "email",
          providerId: "credential",
          accountId: user.id,
          password: passwordHash,
        },
      });

      await ctx.prisma.roleAssignment.upsert({
        where: { userId: user.id },
        update: { role: u.role, isBlocked: false },
        create: {
          id: generateDeterministicUuidV7("test-user-ra", i + 1),
          userId: user.id,
          role: u.role,
          roleId: generateDeterministicUuidV7("test-user-rd", i + 1),
        },
      });
    }

    ctx.logger.info(`✓ Minimal users (${USERS.length})`);
    ctx.logger.end(this.name);
  },
};