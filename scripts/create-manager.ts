// scripts/create-manager.ts
// ============================================
// CRÉATION / RESTAURATION — COMPTE MANAGER
// ============================================
// Usage :
//   1. Arguments CLI : npx tsx scripts/create-manager.ts --email=manager@cogi.com --password="..." --name="Manager COGI"
//   2. Fichier .env.local : MANAGER_EMAIL / MANAGER_PASSWORD / MANAGER_NAME

import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

function parseCliArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  process.argv.slice(2).forEach((arg) => {
    const separator = arg.indexOf("=");
    if (arg.startsWith("--") && separator > 2) {
      const key = arg.slice(2, separator).trim();
      const value = arg.slice(separator + 1).trim();
      if (key && value) args[key] = value;
    }
  });
  return args;
}

async function main() {
  const cliArgs = parseCliArgs();
  const email = (cliArgs.email || process.env.MANAGER_EMAIL)?.trim().toLowerCase();
  const rawPassword = cliArgs.password || process.env.MANAGER_PASSWORD;
  const name = (cliArgs.name || process.env.MANAGER_NAME || "Manager COGI").trim();

  if (!email || !rawPassword) {
    throw new Error(
      "Identifiants manquants. Fournissez --email et --password en argument CLI ou définissez MANAGER_EMAIL et MANAGER_PASSWORD dans .env.local.",
    );
  }

  if (rawPassword.length < 8 || rawPassword.length > 128) {
    throw new Error("Le mot de passe doit contenir entre 8 et 128 caractères.");
  }

  const [
    { prisma },
    { hashPasswordWithBetterAuth },
    { buildRoleConfigSeeds },
    { buildPermissionSeeds },
  ] = await Promise.all([
    import("../lib/prisma"),
    import("../lib/auth/password-hash"),
    import("../prisma/seed/shared/role-config"),
    import("../prisma/seed/shared/permissions"),
  ]);

  console.log(`→ Traitement du compte Manager : ${email} (${name})`);

  try {
    const passwordHash = await hashPasswordWithBetterAuth(rawPassword);
    const managerConfig = buildRoleConfigSeeds().find(
      (roleConfig) => roleConfig.role === "MANAGER",
    );
    if (!managerConfig) {
      throw new Error("La configuration RBAC du rôle MANAGER est introuvable.");
    }
    const permissionSeeds = buildPermissionSeeds();

    await prisma.$transaction(async (tx) => {
      // Upsert du catalogue nécessaire à l'association normalisée RolePermission.
      for (const permission of permissionSeeds) {
        await tx.permission.upsert({
          where: { code: permission.code },
          update: {
            name: permission.name,
            description: permission.description,
            category: permission.category,
            isDangerous: permission.isDangerous,
          },
          create: permission,
        });
      }

      // Source unique de configuration : la même matrice que le seed RBAC.
      const roleConfig = await tx.roleConfig.upsert({
        where: { role: managerConfig.role },
        update: {
          level: managerConfig.level,
          description: managerConfig.description,
          restrictions: managerConfig.restrictions,
          isSystem: managerConfig.isSystem,
          isActive: managerConfig.isActive,
        },
        create: {
          role: managerConfig.role,
          level: managerConfig.level,
          description: managerConfig.description,
          restrictions: managerConfig.restrictions,
          isSystem: managerConfig.isSystem,
          isActive: managerConfig.isActive,
        },
      });

      const grantedCodes = Object.entries(managerConfig.permissions)
        .filter(([, state]) => state === "ON")
        .map(([code]) => code);
      const grantedPermissions = await tx.permission.findMany({
        where: { code: { in: grantedCodes } },
        select: { id: true },
      });
      const grantedPermissionIds = grantedPermissions.map(({ id }) => id);

      await tx.rolePermission.deleteMany({
        where: {
          roleconfigId: roleConfig.id,
          ...(grantedPermissionIds.length > 0 && {
            permissionId: { notIn: grantedPermissionIds },
          }),
        },
      });
      if (grantedPermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: grantedPermissions.map(({ id }) => ({
            roleconfigId: roleConfig.id,
            permissionId: id,
          })),
          skipDuplicates: true,
        });
      }

      const now = new Date();
      const user = await tx.user.upsert({
        where: { email },
        update: {
          name,
          emailVerified: true,
          emailVerifiedAt: now,
          status: "ACTIVE",
          role: managerConfig.role,
        },
        create: {
          name,
          email,
          emailVerified: true,
          emailVerifiedAt: now,
          status: "ACTIVE",
          role: managerConfig.role,
        },
      });

      await tx.roleAssignment.upsert({
        where: { userId: user.id },
        update: {
          roleId: roleConfig.id,
          assignedAt: now,
          lastVerifiedAt: now,
          isBlocked: false,
          blockedReason: null,
          blockedAt: null,
          blockedUntil: null,
        },
        create: {
          userId: user.id,
          roleId: roleConfig.id,
        },
      });

      await tx.account.upsert({
        where: {
          providerId_accountId: { providerId: "credential", accountId: user.id },
        },
        update: { password: passwordHash },
        create: {
          userId: user.id,
          type: "email",
          providerId: "credential",
          accountId: user.id,
          password: passwordHash,
        },
      });

      // Conserver les paramètres de sécurité existants (notamment la 2FA).
      await tx.userSecurity.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
      await tx.userPreferences.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
    });

    console.log(`✓ Compte Manager configuré avec succès : ${email}`);
    console.log(`  - Rôle : MANAGER (Level ${managerConfig.level})`);
    console.log("  - Statut : ACTIF, email vérifié");
    console.log("  - Permissions : synchronisées depuis le RBAC canonique");
    console.log("  - Intégrité transactionnelle : Validée");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("❌ Échec de la création/restauration du Manager :", error);
  process.exitCode = 1;
});
