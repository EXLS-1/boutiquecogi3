// prisma/seed/users.seed.ts

import { PrismaClient, Role as PrismaRole } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/utils/uuid";
import { hash } from "bcryptjs";
import { ROLES, LEVELS, type Role } from "@/lib/auth/rbac";

interface SeedUserOptions {
  email: string;
  password: string;
  name: string;
  role: Role;
}

const DEFAULT_SUPER_ADMIN: SeedUserOptions = {
  email: "excellentservice1exls@gmail.com",
  password: "@@@123Admin123@@@",
  name: "SuperAdmin COGI",
  role: ROLES.SUPER_ADMIN,
};

// ─── Helpers de mapping app → Prisma ────────────────────────────────

const ROLE_TO_PRISMA: Record<Role, PrismaRole> = {
  [ROLES.SUPER_ADMIN]: PrismaRole.SUPER_ADMIN,
  [ROLES.ADMIN]: PrismaRole.ADMIN,
  [ROLES.MANAGER]: PrismaRole.MANAGER,
  [ROLES.EDITOR]: PrismaRole.EDITOR,
  [ROLES.SUPERVISOR]: PrismaRole.SUPERVISOR,
  [ROLES.USER]: PrismaRole.USER,
  [ROLES.GUEST]: PrismaRole.GUEST,
};

const ROLE_TO_LEVEL: Record<Role, number> = {
  [ROLES.SUPER_ADMIN]: LEVELS.LEVEL_1,
  [ROLES.ADMIN]: LEVELS.LEVEL_2,
  [ROLES.MANAGER]: LEVELS.LEVEL_3,
  [ROLES.EDITOR]: LEVELS.LEVEL_4,
  [ROLES.SUPERVISOR]: LEVELS.LEVEL_5,
  [ROLES.USER]: LEVELS.LEVEL_6,
  [ROLES.GUEST]: LEVELS.LEVEL_7,
};

export async function seedUsers(
  prisma: PrismaClient,
  options: Partial<SeedUserOptions> = {}
) {
  const config = { ...DEFAULT_SUPER_ADMIN, ...options };

  console.log(`👤 [RBAC] Création de l'administrateur (${config.role})...`);

  if (!Object.values(ROLES).includes(config.role)) {
    throw new Error(`[RBAC] Rôle invalide: ${config.role}. Attendu: ${Object.values(ROLES).join(", ")}`);
  }

  const prismaRole = ROLE_TO_PRISMA[config.role];
  const roleLevel = ROLE_TO_LEVEL[config.role];

  const superadmin = await prisma.$transaction(async (tx) => {
    const now = new Date();

    // 1. Garnir les fondations RBAC (idempotent) — RoleConfig + RoleDefinition
    const roleConfig = await tx.roleConfig.upsert({
      where: { role: prismaRole },
      update: {
        level: roleLevel,
        isActive: true,
        isSystem: true,
      },
      create: {
        id: generateUUIDv7(),
        role: prismaRole,
        level: roleLevel,
        description: `Rôle système ${config.role}`,
        permissions: {},
        restrictions: {},
        isSystem: true,
        isActive: true,
      },
    });

    const roleDefinition = await tx.roleDefinition.upsert({
      where: { role: prismaRole },
      update: {
        level: roleLevel,
        description: `Rôle système ${config.role}`,
        isSystem: true,
        isActive: true,
      },
      create: {
        id: generateUUIDv7(),
        role: prismaRole,
        level: roleLevel,
        name: config.role,
        description: `Rôle système ${config.role}`,
        permissions: {},
        restrictions: {},
        isSystem: true,
        isActive: true,
      },
    });

    // 2. Utilisateur (colonies réelles du modèle User)
    const user = await tx.user.upsert({
      where: { email: config.email },
      update: {
        emailVerified: true,
        name: config.name,
        roleConfigId: roleConfig.id,
        updatedAt: now,
      },
      create: {
        id: generateUUIDv7(),
        name: config.name,
        email: config.email,
        emailVerified: true,
        emailVerifiedAt: now,
        roleConfigId: roleConfig.id,
        createdAt: now,
        updatedAt: now,
      },
    });

    // 3. Credentials BetterAuth (mot de passe hashé dans Account)
    const passwordHash = await hash(config.password, 10);
    await tx.account.upsert({
      where: {
        providerId_accountId: { providerId: "credential", accountId: user.id },
      },
      update: {
        password: passwordHash,
        updatedAt: now,
      },
      create: {
        id: generateUUIDv7(),
        userId: user.id,
        type: "email",
        providerId: "credential",
        accountId: user.id,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      },
    });

    // 4. RoleAssignment (porteur du rôle applicatif)
    const roleAssignment = await tx.roleAssignment.upsert({
      where: { userId: user.id },
      update: {
        role: prismaRole,
        roleId: roleDefinition.id,
        assignedAt: now,
        lastVerifiedAt: now,
        isBlocked: false,
        // La relation m2m est idempotente — connecter à nouveau est sans risque
        roleDefinitions: { connect: { id: roleDefinition.id } },
      },
      create: {
        id: generateUUIDv7(),
        userId: user.id,
        role: prismaRole,
        roleId: roleDefinition.id,
        assignedAt: now,
        lastVerifiedAt: now,
        isBlocked: false,
        roleDefinitions: { connect: { id: roleDefinition.id } },
      },
    });

    // 5. UserRole (vue normalisée pour l'admin UI)
    await tx.userRole.upsert({
      where: { userId: user.id },
      update: {
        name: config.role,
        role: prismaRole,
        roleConfigId: roleConfig.id,
        roleAssignmentid: roleAssignment.id,
      },
      create: {
        id: generateUUIDv7(),
        userId: user.id,
        name: config.role,
        role: prismaRole,
        roleConfigId: roleConfig.id,
        roleAssignmentid: roleAssignment.id,
      },
    });

    // 6. Rows satellite obligatoires (1:1 avec User)
    await tx.userSecurity.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        id: generateUUIDv7(),
        userId: user.id,
        twoFactorEnabled: false,
        isBlocked: false,
      },
    });

    await tx.userPreferences.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        id: generateUUIDv7(),
        userId: user.id,
        language: "fr",
        theme: "light",
        notifications: {},
      },
    });

    await tx.userQuota.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        id: generateUUIDv7(),
        userId: user.id,
        productCount: 0,
      },
    });

    await tx.userAudit.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        id: generateUUIDv7(),
        userId: user.id,
        isDeleted: false,
        version: 1,
      },
    });

    return { ...user, role: config.role };
  });

  console.log(`   ✓ Super Admin créé: ${superadmin.email} [${superadmin.role}]`);
  return superadmin;
}

