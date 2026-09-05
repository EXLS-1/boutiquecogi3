// scripts/restore-super-admin.ts
// ============================================
// RESTAURATION — COMPTE SUPER_ADMIN DEPUIS .env.local
// ============================================
// Restaure (crée/met à jour/débloque) le compte Super Admin défini par
// SUPER_ADMIN_NAME / SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD.
// Usage : npx tsx scripts/restore-super-admin.ts

import { config } from "dotenv";
import { config as configLocal } from "dotenv";

// .env.local écrase .env (comportement Next.js)
config({ path: ".env" });
configLocal({ path: ".env.local", override: true });

// Import dynamique : le client Prisma doit être instancié APRÈS le chargement
// des variables d'environnement.
async function main() {
  const [{ prisma }, { hash }] = await Promise.all([
    import("../lib/prisma"),
    import("bcryptjs"),
  ]);

  const email = process.env.SUPER_ADMIN_EMAIL;
  const rawPassword = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME || "SuperAdmin COGI";

  if (!email || !rawPassword) {
    throw new Error(
      "SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD non définis dans .env.local",
    );
  }

  console.log(`→ Restauration du compte Super Admin : ${email} (${name})`);

  const passwordHash = await hash(rawPassword, 12);

  // 1. RoleConfig SUPER_ADMIN
  const roleConfig = await prisma.roleConfig.upsert({
    where: { role: "SUPER_ADMIN" },
    update: { isActive: true, isSystem: true },
    create: {
      role: "SUPER_ADMIN",
      level: 1,
      description: "Rôle système Super Admin",
      permissions: {},
      restrictions: {},
      isSystem: true,
      isActive: true,
    },
  });

  // 2. Utilisateur (actif, vérifié)
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, emailVerified: true, emailVerifiedAt: new Date(), status: "ACTIVE" },
    create: { name, email, emailVerified: true, emailVerifiedAt: new Date() },
  });

  // 3. RoleAssignment
  await prisma.roleAssignment.upsert({
    where: { userId: user.id },
    update: {
      roleId: roleConfig.id,
      assignedAt: new Date(),
      lastVerifiedAt: new Date(),
      isBlocked: false,
      blockedReason: null,
    },
    create: { userId: user.id, roleId: roleConfig.id },
  });

  // 4. Compte BetterAuth credential (mot de passe réinitialisé)
  await prisma.account.upsert({
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

  // 5. Satellites
  await prisma.userSecurity.upsert({
    where: { userId: user.id },
    update: { twoFactorEnabled: false, twoFactorSecret: null },
    create: { userId: user.id },
  });
  await prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  console.log(`✓ Compte Super Admin restauré : ${email}`);
  console.log("  - Rôle SUPER_ADMIN (Level 1), débloqué, email vérifié");
  console.log("  - Mot de passe réinitialisé depuis SUPER_ADMIN_PASSWORD");
}

main()
  .then(() => import("../lib/prisma"))
  .then(({ prisma }) => prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ Échec de la restauration :", e);
    const { prisma } = await import("../lib/prisma");
    await prisma.$disconnect();
    process.exit(1);
  });
