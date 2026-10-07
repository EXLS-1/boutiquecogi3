// scripts/create-manager.ts
// ============================================
// CRÉATION / RESTAURATION — COMPTE MANAGER
// ============================================
// Usage :
//   1. Arguments CLI : npx tsx scripts/create-manager.ts --email=manager@cogi.com --password=Secret123! --name="Manager COGI"
//   2. Fichier .env.local : MANAGER_EMAIL / MANAGER_PASSWORD / MANAGER_NAME

import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

function parseCliArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      if (key && value) {
        args[key.trim()] = value.trim();
      }
    }
  });
  return args;
}

async function main() {
  const cliArgs = parseCliArgs();

  const email = cliArgs.email || process.env.MANAGER_EMAIL;
  const rawPassword = cliArgs.password || process.env.MANAGER_PASSWORD;
  const name = cliArgs.name || process.env.MANAGER_NAME || "Manager COGI";

  if (!email || !rawPassword) {
    throw new Error(
      "Identifiants manquants. Fournissez --email et --password en argument CLI ou définissez MANAGER_EMAIL et MANAGER_PASSWORD dans .env.local."
    );
  }

  if (rawPassword.length < 8) {
    throw new Error("Incapacité de sécurité : Le mot de passe doit contenir au moins 8 caractères.");
  }

  const [{ prisma }, { hash }] = await Promise.all([
    import("../lib/prisma"),
    import("bcryptjs"),
  ]);

  console.log(`→ Traitement du compte Manager : ${email} (${name})`);

  const passwordHash = await hash(rawPassword, 12);

  // Exécution atomique : Tout réussit ou tout échoue (rollback automatique)
  await prisma.$transaction(async (tx) => {
    // 1. RoleConfig MANAGER (Level 2)
    const roleConfig = await tx.roleConfig.upsert({
      where: { role: "MANAGER" },
      update: { isActive: true, isSystem: true },
      create: {
        role: "MANAGER",
        level: 2,
        description: "Rôle de gestionnaire opérationnel",
        permissions: {
          products: ["create", "read", "update"],
          orders: ["read", "update"],
          inventory: ["read", "update"],
          categories: ["create", "read", "update"],
        },
        restrictions: {},
        isSystem: true,
        isActive: true,
      },
    });

    // 2. Utilisateur (Actif et vérifié)
    const user = await tx.user.upsert({
      where: { email },
      update: {
        name,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: "ACTIVE",
        role: "MANAGER",
      },
      create: {
        name,
        email,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: "ACTIVE",
        role: "MANAGER",
      },
    });

    // 3. RoleAssignment
    await tx.roleAssignment.upsert({
      where: { userId: user.id },
      update: {
        roleId: roleConfig.id,
        assignedAt: new Date(),
        lastVerifiedAt: new Date(),
        isBlocked: false,
        blockedReason: null,
      },
      create: {
        userId: user.id,
        roleId: roleConfig.id,
      },
    });

    // 4. Compte BetterAuth (Credential)
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

    // 5. Satellites
    await tx.userSecurity.upsert({
      where: { userId: user.id },
      update: { twoFactorEnabled: false, twoFactorSecret: null },
      create: { userId: user.id },
    });

    await tx.userPreferences.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
  });

  console.log(`✓ Compte Manager configuré avec succès : ${email}`);
  console.log("  - Rôle : MANAGER (Level 2)");
  console.log("  - Statut : ACTIF, email vérifié");
  console.log("  - Intégrité transactionnelle : Validée");
}

main()
  .then(() => import("../lib/prisma"))
  .then(({ prisma }) => prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ Échec de la création/restauration du Manager :", e);
    const { prisma } = await import("../lib/prisma");
    await prisma.$disconnect();
    process.exit(1);
  });