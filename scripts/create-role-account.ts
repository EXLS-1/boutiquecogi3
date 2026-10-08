import { config } from "dotenv";
import type { Prisma, Role } from "@prisma/client";

config({ path: ".env" });
config({ path: ".env.local", override: true });

interface CliArgs {
  email?: string;
  password?: string;
  name?: string;
  force: boolean;
}

interface CreateRoleAccountOptions {
  role: Exclude<Role, "USER" | "GUEST">;
  expectedLevel: number;
  envPrefix: string;
  defaultName: string;
  minPasswordLength?: number;
  fallbackEnvPrefix?: string;
  enforceSingleSuperAdmin?: boolean;
}

function parseCliArgs(): CliArgs {
  const args: CliArgs = { force: false };

  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith("--")) continue;

    const separator = arg.indexOf("=");
    const key = arg.slice(2, separator > -1 ? separator : undefined).trim();
    const value = separator > -1 ? arg.slice(separator + 1) : "";

    if (key === "force" && separator === -1) {
      args.force = true;
    } else if (key === "email" && value.trim()) {
      args.email = value.trim();
    } else if (key === "password" && value.length > 0) {
      args.password = value;
    } else if (key === "name" && value.trim()) {
      args.name = value.trim();
    }
  }

  return args;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function upsertRoleConfig(
  tx: Prisma.TransactionClient,
  roleSeed: {
    role: Role;
    level: number;
    description: string;
    restrictions: Record<string, string | "ON" | "OFF">;
    isSystem: boolean;
    isActive: boolean;
    permissions: Record<string, "ON" | "OFF">;
  },
) {
  const roleConfig = await tx.roleConfig.upsert({
    where: { role: roleSeed.role },
    update: {
      level: roleSeed.level,
      description: roleSeed.description,
      restrictions: roleSeed.restrictions,
      isSystem: roleSeed.isSystem,
      isActive: roleSeed.isActive,
    },
    create: {
      role: roleSeed.role,
      level: roleSeed.level,
      description: roleSeed.description,
      restrictions: roleSeed.restrictions,
      isSystem: roleSeed.isSystem,
      isActive: roleSeed.isActive,
    },
  });

  const grantedCodes = Object.entries(roleSeed.permissions)
    .filter(([, state]) => state === "ON")
    .map(([code]) => code);
  const grantedPermissions = await tx.permission.findMany({
    where: { code: { in: grantedCodes } },
    select: { id: true, code: true },
  });
  const grantedPermissionIds = grantedPermissions.map(({ id }) => id);
  const foundCodes = new Set(grantedPermissions.map(({ code }) => code));
  const missingCodes = grantedCodes.filter((code) => !foundCodes.has(code));

  if (missingCodes.length > 0) {
    throw new Error(
      `Permissions RBAC absentes du catalogue pour ${roleSeed.role} : ${missingCodes.join(", ")}`,
    );
  }

  await tx.rolePermission.deleteMany({
    where: {
      roleconfigId: roleConfig.id,
      ...(grantedPermissionIds.length > 0 && {
        permissionId: { notIn: grantedPermissionIds },
      }),
    },
  });

  if (grantedPermissionIds.length > 0) {
    await tx.rolePermission.createMany({
      data: grantedPermissionIds.map((permissionId) => ({
        roleconfigId: roleConfig.id,
        permissionId,
      })),
      skipDuplicates: true,
    });
  }

  return roleConfig;
}

async function main(options: CreateRoleAccountOptions): Promise<void> {
  const cliArgs = parseCliArgs();
  const fallbackPrefix = options.fallbackEnvPrefix;
  const email = (
    cliArgs.email ||
    process.env[`${options.envPrefix}_EMAIL`] ||
    (fallbackPrefix && process.env[`${fallbackPrefix}_EMAIL`])
  )
    ?.trim()
    .toLowerCase();
  const rawPassword =
    cliArgs.password ||
    process.env[`${options.envPrefix}_PASSWORD`] ||
    (fallbackPrefix && process.env[`${fallbackPrefix}_PASSWORD`]);
  const name = (
    cliArgs.name ||
    process.env[`${options.envPrefix}_NAME`] ||
    (fallbackPrefix && process.env[`${fallbackPrefix}_NAME`]) ||
    options.defaultName
  ).trim();
  const minPasswordLength = options.minPasswordLength ?? 8;

  if (!email || !rawPassword) {
    throw new Error(
      `Identifiants manquants. Fournissez --email et --password ou définissez ${options.envPrefix}_EMAIL et ${options.envPrefix}_PASSWORD dans .env.local.`,
    );
  }
  if (!isValidEmail(email)) {
    throw new Error(`Format d'email invalide : "${email}"`);
  }
  if (rawPassword.length < minPasswordLength || rawPassword.length > 128) {
    throw new Error(
      `Le mot de passe doit contenir entre ${minPasswordLength} et 128 caractères.`,
    );
  }
  if (!name) {
    throw new Error("Le nom du compte ne peut pas être vide.");
  }
  if (options.enforceSingleSuperAdmin && options.role !== "SUPER_ADMIN") {
    throw new Error("Configuration invalide pour le rôle SUPER_ADMIN.");
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

  try {
    const roleSeed = buildRoleConfigSeeds().find(
      (candidate) => candidate.role === options.role,
    );
    if (!roleSeed) {
      throw new Error(`La configuration RBAC du rôle ${options.role} est introuvable.`);
    }
    if (roleSeed.level !== options.expectedLevel) {
      throw new Error(
        `Niveau RBAC inattendu pour ${options.role} : ${roleSeed.level} (attendu : ${options.expectedLevel}).`,
      );
    }

    console.log(`→ Traitement du compte ${options.role} : ${email} (${name})`);

    const passwordHash = await hashPasswordWithBetterAuth(rawPassword);
    const permissionSeeds = buildPermissionSeeds();

    await prisma.$transaction(async (tx) => {
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

      const matchingUsers = await tx.user.findMany({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true },
        take: 2,
      });
      if (matchingUsers.length > 1) {
        throw new Error(
          `Plusieurs comptes utilisent une adresse équivalente à "${email}" sans distinction de casse. Corrigez les doublons avant de continuer.`,
        );
      }
      const existingUser = matchingUsers[0];

      const targetRoleConfig = await upsertRoleConfig(tx, roleSeed);

      if (options.enforceSingleSuperAdmin) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(187003, 1)`;

        const defaultRoleSeed = buildRoleConfigSeeds().find(
          (candidate) => candidate.role === "USER",
        );
        if (!defaultRoleSeed) {
          throw new Error("La configuration RBAC du rôle USER est introuvable.");
        }
        const defaultRoleConfig = await upsertRoleConfig(tx, defaultRoleSeed);

        const directlyAssigned = await tx.user.findMany({
          where: { role: "SUPER_ADMIN" },
          select: { id: true },
        });
        const roleAssigned = await tx.roleAssignment.findMany({
          where: { roleId: targetRoleConfig.id },
          select: { userId: true },
        });
        const existingIds = new Set([
          ...directlyAssigned.map(({ id }) => id),
          ...roleAssigned.map(({ userId }) => userId),
        ]);
        if (existingUser) existingIds.delete(existingUser.id);

        if (existingIds.size > 0 && !cliArgs.force) {
          const existingAdmins = await tx.user.findMany({
            where: { id: { in: [...existingIds] } },
            select: { email: true },
          });
          throw new Error(
            `Un ou plusieurs autres comptes possèdent déjà le rôle SUPER_ADMIN (${existingAdmins
              .map(({ email: existingEmail }) => existingEmail)
              .join(", ")}). Ajoutez --force pour transférer le rôle et rétrograder les anciens comptes.`,
          );
        }

        if (existingIds.size > 0) {
          console.warn(
            `⚠️ Rétrogradation forcée de ${existingIds.size} ancien(s) Super Admin(s)...`,
          );
          for (const userId of existingIds) {
            const assignment = await tx.roleAssignment.findUnique({
              where: { userId },
              select: { id: true },
            });
            if (assignment) {
              await tx.permissionOverride.deleteMany({
                where: { roleAssignmentId: assignment.id },
              });
            }

            await tx.user.update({
              where: { id: userId },
              data: { role: "USER" },
            });
            await tx.roleAssignment.upsert({
              where: { userId },
              update: {
                roleId: defaultRoleConfig.id,
                assignedAt: new Date(),
                lastVerifiedAt: new Date(),
                isBlocked: false,
                blockedReason: null,
                blockedAt: null,
                blockedUntil: null,
              },
              create: { userId, roleId: defaultRoleConfig.id },
            });
            await tx.session.deleteMany({ where: { userId } });
          }
        }
      }

      const now = new Date();
      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              email,
              name,
              emailVerified: true,
              emailVerifiedAt: now,
              status: "ACTIVE",
              role: options.role,
            },
          })
        : await tx.user.create({
            data: {
              name,
              email,
              emailVerified: true,
              emailVerifiedAt: now,
              status: "ACTIVE",
              role: options.role,
            },
          });

      await tx.roleAssignment.upsert({
        where: { userId: user.id },
        update: {
          roleId: targetRoleConfig.id,
          assignedAt: now,
          lastVerifiedAt: now,
          isBlocked: false,
          blockedReason: null,
          blockedAt: null,
          blockedUntil: null,
        },
        create: { userId: user.id, roleId: targetRoleConfig.id },
      });

      await tx.account.upsert({
        where: {
          providerId_accountId: {
            providerId: "credential",
            accountId: user.id,
          },
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
      await tx.userQuota.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
      await tx.userAudit.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
      await tx.session.deleteMany({ where: { userId: user.id } });
    });

    console.log(`✓ Compte ${options.role} configuré avec succès : ${email}`);
    console.log(`  - Rôle : ${options.role} (Level ${roleSeed.level})`);
    console.log("  - Statut : ACTIF, email vérifié");
    console.log("  - Permissions : synchronisées depuis le RBAC canonique");
    if (options.enforceSingleSuperAdmin) {
      console.log("  - Unicité SUPER_ADMIN : vérifiée dans la transaction");
    }
    console.log("  - Sessions existantes : invalidées");
    console.log("  - Intégrité transactionnelle : Validée");
  } finally {
    await prisma.$disconnect();
  }
}

export function createRoleAccount(options: CreateRoleAccountOptions): Promise<void> {
  return main(options);
}
