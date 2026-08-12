// scripts/seed-super-admin.ts
/**
 * SEED SUPER ADMIN — Boutiquecogi3
 * 
 * Usage:
 *   npx tsx scripts/seed-super-admin.ts
 * 
 * Variables d'environnement requises:
 *   SUPER_ADMIN_EMAIL      → email du Super Admin
 *   SUPER_ADMIN_PASSWORD   → mot de passe fort (min 12 caractères)
 *   DATABASE_URL           → URL PostgreSQL (déjà configurée normalement)
 * 
 * Ce script est IDEMPOTENT : s'il détecte déjà un Super Admin,
 * il s'arrête immédiatement (sauf si --force est passé).
 */

import "dotenv/config";
import { Role, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateUUIDv7 } from '@/lib/utils/uuid';
import { prisma } from "@/lib/prisma";

// ─── Configuration ─────────────────────────────────────────────
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME || "Super Administrateur";
const FORCE = process.argv.includes("--force");

// Niveaux RBAC
const ROLE_LEVELS: Record<Role, number> = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  MANAGER: 3,
  EDITOR: 4,
  SUPERVISOR: 5,
  USER: 6,
  GUEST: 7,
};

// ─── Helpers ───────────────────────────────────────────────────

function exit(code: number, message: string): never {
  console.error(`\n❌ ${message}`);
  process.exit(code);
}

function success(message: string): void {
  console.log(`\n✅ ${message}`);
}

/** Génère un UUID v7-like (fallback sur generateUUIDv7 si besoin) */
function generateUUID(): string {
  // Si tu as installé `uuidv7`, utilise-le ici. Sinon generateUUIDv7() suffit
  // car PostgreSQL @db.Uuid accepte tout UUID valide.
  return generateUUIDv7();
}

/** Permissions de base pour SUPER_ADMIN (tout=ON) */
function buildSuperAdminPermissions(): Prisma.InputJsonValue {
  const perms: Record<string, string> = {};
  const categories = [
    "USER", "PRODUCT", "ORDER", "FINANCE", "CATEGORY", "INVENTORY",
    "SHIPPING", "PAYMENT", "COUPON", "ANALYTICS", "SYSTEM", "ROLE",
  ];
  const actions = ["create", "read", "update", "delete", "manage", "block", "approve"];

  for (const cat of categories) {
    for (const act of actions) {
      perms[`${cat.toLowerCase()}:${act}`] = "ON";
    }
  }
  return perms as Prisma.InputJsonValue;
}

/** Restrictions vides pour SUPER_ADMIN (aucune restriction) */
function buildSuperAdminRestrictions(): Prisma.InputJsonValue {
  return {
    max_daily_orders: null,
    can_access_analytics: "ON",
    can_manage_roles: "ON",
    can_delete_users: "ON",
    can_override_payments: "ON",
  } as Prisma.InputJsonValue;
}

// ─── Validation ────────────────────────────────────────────────

if (!SUPER_ADMIN_EMAIL) exit(1, "SUPER_ADMIN_EMAIL manquant dans .env");
if (!SUPER_ADMIN_PASSWORD) exit(1, "SUPER_ADMIN_PASSWORD manquant dans .env");
if (SUPER_ADMIN_PASSWORD.length < 12) exit(1, "Le mot de passe doit faire au moins 12 caractères");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(SUPER_ADMIN_EMAIL)) exit(1, "SUPER_ADMIN_EMAIL invalide");

// ─── Logique principale ────────────────────────────────────────

async function main() {
  console.log("🔐 Seed Super Admin — Boutiquecogi3");
  console.log("─────────────────────────────────────");

  // 1. Vérification idempotence : existe-t-il déjà un Super Admin ?
  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: SUPER_ADMIN_EMAIL },
        {
          roleConfig: { role: Role.SUPER_ADMIN },
        },
        {
          roleAssignment: { role: Role.SUPER_ADMIN },
        },
      ],
    },
    include: { roleConfig: true, roleAssignment: true },
  });

  if (existingSuperAdmin && !FORCE) {
    exit(
      0,
      `Un utilisateur avec ce email ou un Super Admin existe déjà (ID: ${existingSuperAdmin.id}).\n` +
      `Utilise --force pour forcer la création (dangereux).`
    );
  }

  if (existingSuperAdmin && FORCE) {
    console.log("⚠️  Mode FORCE activé — suppression du Super Admin existant...");

    await prisma.$transaction(async (tx) => {
      await tx.account.deleteMany({ where: { userId: existingSuperAdmin.id } });
      await tx.session.deleteMany({ where: { userId: existingSuperAdmin.id } });
      await tx.twoFactor.deleteMany({ where: { userId: existingSuperAdmin.id } });
      await tx.userSecurity.deleteMany({ where: { userId: existingSuperAdmin.id } });
      await tx.userPreferences.deleteMany({ where: { userId: existingSuperAdmin.id } });
      await tx.userQuota.deleteMany({ where: { userId: existingSuperAdmin.id } });
      await tx.userAudit.deleteMany({ where: { userId: existingSuperAdmin.id } });
      await tx.userRole.deleteMany({ where: { userId: existingSuperAdmin.id } });
      await tx.roleAssignment.deleteMany({ where: { userId: existingSuperAdmin.id } });
      await tx.notification.deleteMany({ where: { userId: existingSuperAdmin.id } });
      await tx.auditLog.deleteMany({ where: { userId: existingSuperAdmin.id } });
      await tx.user.delete({ where: { id: existingSuperAdmin.id } });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10000,
      timeout: 30000,
    });

    console.log("   Ancien Super Admin supprimé.");
  }

  // 2. Vérifier / créer RoleConfig SUPER_ADMIN
  let roleConfig = await prisma.roleConfig.findUnique({
    where: { role: Role.SUPER_ADMIN },
  });

  if (!roleConfig) {
    console.log("📋 Création du RoleConfig SUPER_ADMIN...");
    roleConfig = await prisma.roleConfig.create({
      data: {
        id: generateUUID(),
        role: Role.SUPER_ADMIN,
        level: ROLE_LEVELS[Role.SUPER_ADMIN],
        description: "Super Administrateur — contrôle total de la plateforme",
        permissions: buildSuperAdminPermissions(),
        restrictions: buildSuperAdminRestrictions(),
        isSystem: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`   RoleConfig créé : ${roleConfig.id}`);
  } else {
    console.log(`   RoleConfig existant : ${roleConfig.id}`);
  }

  // 3. Vérifier / créer RoleDefinition SUPER_ADMIN
  let roleDefinition = await prisma.roleDefinition.findUnique({
    where: { role: Role.SUPER_ADMIN },
  });

  if (!roleDefinition) {
    console.log("📋 Création du RoleDefinition SUPER_ADMIN...");
    roleDefinition = await prisma.roleDefinition.create({
      data: {
        id: generateUUID(),
        role: Role.SUPER_ADMIN,
        level: ROLE_LEVELS[Role.SUPER_ADMIN],
        name: "Super Administrateur",
        description: "Accès illimité à toutes les ressources et configurations système",
        permissions: buildSuperAdminPermissions(),
        restrictions: buildSuperAdminRestrictions(),
        isSystem: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`   RoleDefinition créé : ${roleDefinition.id}`);
  } else {
    console.log(`   RoleDefinition existant : ${roleDefinition.id}`);
  }

  // 4. Hash du mot de passe (Better-Auth utilise bcrypt par défaut, cost=10)
  console.log("🔑 Hashage du mot de passe...");
  const passwordHash = (await bcrypt.hash(SUPER_ADMIN_PASSWORD!, 10)) as string;

  // 5. Création atomique de l'utilisateur et toutes ses relations
  console.log("👤 Création du Super Admin...");

  const userId = generateUUID();
  const now = new Date();

  // Transaction atomique — tout ou rien
  const superAdmin = await prisma.$transaction(async (tx) => {
    // 5a. User
    const user = await tx.user.create({
      data: {
        id: userId,
email: SUPER_ADMIN_EMAIL!,
        emailVerified: true,
        emailVerifiedAt: now,
        name: SUPER_ADMIN_NAME,
        image: null,
        roleConfigId: roleConfig.id,
        createdAt: now,
        updatedAt: now,
      },
    });

    // 5b. Account (Better-Auth — credentials)
    await tx.account.create({
      data: {
        id: generateUUID(),
        userId: user.id,
        type: "email",
        providerId: "credential",
        accountId: user.id, // Better-Auth convention : accountId = userId pour credentials
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      },
    });

    // 5c. RoleAssignment
    const roleAssignment = await tx.roleAssignment.create({
      data: {
        id: generateUUID(),
        userId: user.id,
        role: Role.SUPER_ADMIN,
        roleId: roleDefinition.id,
        assignedAt: now,
        lastVerifiedAt: now,
        isBlocked: false,
        roleDefinitions: {
          connect: { id: roleDefinition.id },
        },
      },
    });

    // 5d. UserRole
    await tx.userRole.create({
      data: {
        id: generateUUID(),
        userId: user.id,
        name: Role.SUPER_ADMIN,
        role: Role.SUPER_ADMIN,
        roleConfigId: roleConfig.id,
        roleAssignmentid: roleAssignment.id,
      },
    });

    // 5e. UserSecurity (non bloqué, 2FA désactivé)
    await tx.userSecurity.create({
      data: {
        id: generateUUID(),
        userId: user.id,
        twoFactorEnabled: false,
        isBlocked: false,
      },
    });

    // 5f. UserPreferences
    await tx.userPreferences.create({
      data: {
        id: generateUUID(),
        userId: user.id,
        language: "fr",
        theme: "light",
        notifications: {},
      },
    });

    // 5g. UserQuota
    await tx.userQuota.create({
      data: {
        id: generateUUID(),
        userId: user.id,
        productCount: 0,
      },
    });

    // 5h. UserAudit
    await tx.userAudit.create({
      data: {
        id: generateUUID(),
        userId: user.id,
        isDeleted: false,
        version: 1,
      },
    });

    return user;
  }, {
    // Isolation maximale
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 10000,
    timeout: 30000,
  });

  // 6. Audit log interne (optionnel mais recommandé)
  await prisma.auditLog.create({
    data: {
      id: generateUUID(),
      userId: superAdmin.id,
      roleLevel: ROLE_LEVELS[Role.SUPER_ADMIN],
      action: "SUPER_ADMIN_SEEDED",
      targetType: "USER",
      targetId: superAdmin.id,
      details: JSON.stringify({
        email: SUPER_ADMIN_EMAIL,
        method: "seed-script",
        timestamp: now.toISOString(),
      }),
      ipAddress: "127.0.0.1",
      userAgent: "seed-script/1.0.0",
      createdAt: now,
      updatedAt: now,
    },
  });

  // ─── Résultat ────────────────────────────────────────────────
  success("Super Admin créé avec succès !");
  console.log(`
┌─────────────────────────────────────────┐
│  📧 Email    : ${SUPER_ADMIN_EMAIL!.padEnd(29)}│
│  🆔 User ID  : ${superAdmin.id.slice(0, 8)}...${superAdmin.id.slice(-4)}          │
│  🛡️  Rôle     : SUPER_ADMIN (Niveau 1)    │
│  🔐 2FA      : Désactivé                │
│  ✅ Email    : Vérifié                  │
└─────────────────────────────────────────┘
`);
  console.log("⚠️  IMPORTANT : Change le mot de passe après première connexion.");
  console.log("   → Connecte-toi via /api/auth/sign-in avec email + mot de passe.\n");
}

// ─── Exécution ─────────────────────────────────────────────────

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

