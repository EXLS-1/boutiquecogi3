// prisma/seed/prod/01-super-admin.ts
// ============================================
// PRODUCTION — SUPER ADMIN INITIAL SÉCURISÉ
// ============================================
// Ne crée que le Super Admin (Level 1). Les identifiants proviennent
// des variables d'environnement (jamais de valeurs métier en dur).

import { Seeder } from "../types";
import { generateUUIDv7 } from "../utils/uuid";
import { hash } from "bcryptjs";

export const ProdSuperAdminSeeder: Seeder = {
  name: "prod:super-admin",
  order: 10,
  async run(ctx) {
    ctx.logger.start(this.name);

    const email = process.env.INITIAL_SUPERADMIN_EMAIL;
    const rawPassword = process.env.INITIAL_SUPERADMIN_PASSWORD;
    const name = process.env.INITIAL_SUPERADMIN_NAME || "SuperAdmin COGI3";

    if (!email || !rawPassword) {
      ctx.logger.warn(
        "INITIAL_SUPERADMIN_EMAIL / INITIAL_SUPERADMIN_PASSWORD non définis — Super Admin ignoré.",
      );
      return;
    }

    if (rawPassword.length < 12) {
      throw new Error(
        "❌ [SECURITY] Le mot de passe Super Admin doit contenir au moins 12 caractères.",
      );
    }

    // Hachage sécurisé unique (coût 12) — réservé au prod.
    const passwordHash = await hash(rawPassword, 12);

    await ctx.prisma.$transaction(async (tx) => {
      const roleConfig = await tx.roleConfig.upsert({
        where: { role: "SUPER_ADMIN" },
        update: { isActive: true, isSystem: true },
        create: {
          id: generateUUIDv7(),
          role: "SUPER_ADMIN",
          level: 1,
          description: "Rôle système Super Admin",
          permissions: {},
          restrictions: {},
          isSystem: true,
          isActive: true,
        },
      });

      const user = await tx.user.upsert({
        where: { email },
        update: { name, emailVerified: true },
        create: {
          id: generateUUIDv7(),
          name,
          email,
          emailVerified: true,
        },
      });

      await tx.roleAssignment.upsert({
        where: { userId: user.id },
        update: { roleId: roleConfig.id, assignedAt: new Date(), lastVerifiedAt: new Date(), isBlocked: false },
        create: { userId: user.id, roleId: roleConfig.id },
      });

      await tx.account.upsert({
        where: {
          providerId_accountId: { providerId: "credential", accountId: user.id },
        },
        update: { password: passwordHash },
        create: {
          id: generateUUIDv7(),
          userId: user.id,
          type: "email",
          providerId: "credential",
          accountId: user.id,
          password: passwordHash,
        },
      });

      await tx.userSecurity.upsert({
        where: { userId: user.id },
        update: {},
        create: { id: generateUUIDv7(), userId: user.id },
      });

      await tx.userPreferences.upsert({
        where: { userId: user.id },
        update: {},
        create: { id: generateUUIDv7(), userId: user.id },
      });
    });

    ctx.logger.info(`✓ Super Admin sécurisé : ${email}`);
    ctx.logger.end(this.name);
  },
};
