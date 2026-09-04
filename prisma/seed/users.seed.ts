// prisma/seed/users.seed.ts

import { PrismaClient, Role as PrismaRole } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/utils/uuid";
import { hash } from "bcryptjs";
import { ROLES, LEVELS, type Role } from "@/lib/auth/rbac";

interface SeedUserOptions {
  email?: string;
  password?: string;
  name?: string;
  role?: Role;
}

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
  options: SeedUserOptions = {}
) {
  // 1. Extraction et validation stricte des variables d'environnement
  const email = options.email || process.env.INITIAL_SUPERADMIN_EMAIL;
  const rawPassword = options.password || process.env.INITIAL_SUPERADMIN_PASSWORD;
  const name = options.name || process.env.INITIAL_SUPERADMIN_NAME || "SuperAdmin COGI";
  const role = options.role || ROLES.SUPER_ADMIN;

  if (!email || !rawPassword) {
    throw new Error(
      "❌ [SECURITY FATAL] INITIAL_SUPERADMIN_EMAIL et INITIAL_SUPERADMIN_PASSWORD doivent être définis dans l'environnement."
    );
  }

  if (rawPassword.length < 12) {
    throw new Error("❌ [SECURITY FATAL] Le mot de passe initial du SuperAdmin doit contenir au moins 12 caractères.");
  }

  console.log(`👤 [RBAC] Amorce sécurisée de l'administrateur root (${role})...`);

  const prismaRole = ROLE_TO_PRISMA[role];
  const roleLevel = ROLE_TO_LEVEL[role];

  if (!prismaRole || roleLevel === undefined) {
    throw new Error(`[RBAC] Configuration de rôle invalide ou non reconnue: ${role}`);
  }

  // Cost factor augmenté à 12 pour le hachage root en production
  const passwordHash = await hash(rawPassword, 12);

  const superadmin = await prisma.$transaction(async (tx) => {
    const now = new Date();

    // 1. Configuration du rôle système
    const roleConfig = await tx.roleConfig.upsert({
      where: { role: prismaRole },
      update: { level: roleLevel, isActive: true, isSystem: true },
      create: {
        id: generateUUIDv7(),
        role: prismaRole,
        level: roleLevel,
        description: `Rôle système ${role}`,
        permissions: {},
        restrictions: {},
        isSystem: true,
        isActive: true,
      },
    });

    // 2. Création/Mise à jour de l'utilisateur root
    const user = await tx.user.upsert({
      where: { email },
      update: {
        emailVerified: true,
        name,
        roleConfigId: roleConfig.id,
        updatedAt: now,
      },
      create: {
        id: generateUUIDv7(),
        name,
        email,
        emailVerified: true,
        emailVerifiedAt: now,
        roleConfigId: roleConfig.id,
        createdAt: now,
        updatedAt: now,
      },
    });

    // 3. Credentials de l'utilisateur dans Account
    await tx.account.upsert({
      where: {
        providerId_accountId: { providerId: "credential", accountId: user.id },
      },
      update: { password: passwordHash, updatedAt: now },
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

    // 4. Attribution canonique du rôle
    const roleAssignment = await tx.roleAssignment.upsert({
      where: { userId: user.id },
      update: {
        roleId: roleConfig.id,
        assignedAt: now,
        lastVerifiedAt: now,
        isBlocked: false,
      },
      create: {
        id: generateUUIDv7(),
        userId: user.id,
        roleId: roleConfig.id,
        assignedAt: now,
        lastVerifiedAt: now,
        isBlocked: false,
      },
    });

    // 5. Projection UserRole
    await tx.userRole.upsert({
      where: { userId: user.id },
      update: {
        name: role,
        role: prismaRole,
        roleConfigId: roleConfig.id,
      },
      create: {
        id: generateUUIDv7(),
        userId: user.id,
        name: role,
        role: prismaRole,
        roleConfigId: roleConfig.id,
      },
    });

    // 6. Satellites 1:1
    await tx.userSecurity.upsert({
      where: { userId: user.id },
      update: {},
      create: { id: generateUUIDv7(), userId: user.id, twoFactorEnabled: false, isBlocked: false },
    });

    await tx.userPreferences.upsert({
      where: { userId: user.id },
      update: {},
      create: { id: generateUUIDv7(), userId: user.id, language: "fr", theme: "light", notifications: {} },
    });

    await tx.userQuota.upsert({
      where: { userId: user.id },
      update: {},
      create: { id: generateUUIDv7(), userId: user.id, productCount: 0 },
    });

    await tx.userAudit.upsert({
      where: { userId: user.id },
      update: {},
      create: { id: generateUUIDv7(), userId: user.id, isDeleted: false, version: 1 },
    });

    // 7. SÉCURITÉ SESSION : Invalidation de toutes les sessions actives de cet utilisateur
    // afin de purger les éventuels jetons obsolètes.
    await tx.session.deleteMany({
      where: { userId: user.id },
    });

    return { ...user, role };
  });

  console.log(`   ✓ Bootstrapping exécuté : ${superadmin.email} [${superadmin.role}]`);
  return superadmin;
}
