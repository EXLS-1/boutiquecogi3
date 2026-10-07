// scripts/create-super-admin.ts
// ============================================
// RESTAURATION / CRÉATION UNIQUE — COMPTE SUPER_ADMIN
// ============================================
// Garantit qu'UN SEUL ET UNIQUE compte détient le rôle SUPER_ADMIN (Level 1).
// En cas de changement d'email, l'ancien Super Admin est rétrogradé ou
// l'opération est bloquée sauf si l'option --force est fournie.
//
// Usage :
//   1. Variables .env.local : npx tsx scripts/create-super-admin.ts
//   2. Arguments CLI        : npx tsx scripts/create-super-admin.ts --email=admin@cogi.com --password="SuperSecurePassword123!" --force

import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

interface CliArgs {
  email?: string;
  password?: string;
  name?: string;
  force?: boolean;
}

function parseCliArgs(): CliArgs {
  const args: CliArgs = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      if (key === "force") {
        args.force = true;
      } else if (key && value) {
        (args as Record<string, unknown>)[key.trim()] = value.trim();
      }
    }
  });
  return args;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function main() {
  const cliArgs = parseCliArgs();

  const email = cliArgs.email || process.env.SUPER_ADMIN_EMAIL;
  const rawPassword = cliArgs.password || process.env.SUPER_ADMIN_PASSWORD;
  const name = cliArgs.name || process.env.SUPER_ADMIN_NAME || "SuperAdmin COGI";
  const force = cliArgs.force || false;

  // 1. Validation Fail-Fast des entrées
  if (!email || !rawPassword) {
    throw new Error(
      "Identifiants manquants. Spécifiez SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD dans .env.local ou via CLI (--email=... --password=...)."
    );
  }

  if (!validateEmail(email)) {
    throw new Error(`Format d'email invalide : "${email}"`);
  }

  if (rawPassword.length < 12) {
    throw new Error(
      "Exigence de sécurité non respectée : Le mot de passe Super Admin doit contenir au moins 12 caractères."
    );
  }

  const [{ prisma }, { hash }] = await Promise.all([
    import("../lib/prisma"),
    import("bcryptjs"),
  ]);

  console.log(`→ Traitement du compte Super Admin Unique : ${email} (${name})`);

  const passwordHash = await hash(rawPassword, 12);

  // 2. Transaction atomique interactive
  await prisma.$transaction(async (tx) => {
    // A. Configuration du RoleConfig SUPER_ADMIN (Level 1)
    const roleConfig = await tx.roleConfig.upsert({
      where: { role: "SUPER_ADMIN" },
      update: { isActive: true, isSystem: true, level: 1 },
      create: {
        role: "SUPER_ADMIN",
        level: 1,
        description: "Privilège système absolu (Super Admin)",
        permissions: { "*": ["*"] }, // All-access wildcard
        restrictions: {},
        isSystem: true,
        isActive: true,
      },
    });

    // B. Contrôle strict de l'unicité : Recherche d'anciens Super Admins
    const existingSuperAdmins = await tx.user.findMany({
      where: {
        role: "SUPER_ADMIN",
        email: { not: email },
      },
    });

    if (existingSuperAdmins.length > 0) {
      if (!force) {
        const rogueEmails = existingSuperAdmins.map((u) => u.email).join(", ");
        throw new Error(
          `Violation d'unicité : Un ou plusieurs autres comptes possèdent déjà le rôle SUPER_ADMIN (${rogueEmails}). ` +
            `Pour effectuer le transfert vers "${email}" et rétrograder les anciens comptes, ajoutez le drapeau --force.`
        );
      }

      console.warn(
        `⚠️ Rétrogradation forcée de ${existingSuperAdmins.length} ancien(s) Super Admin(s)...`
      );

      // Obtenir ou créer le rôle par défaut "USER" pour la rétrogradation
      const defaultRoleConfig = await tx.roleConfig.upsert({
        where: { role: "USER" },
        update: {},
        create: {
          role: "USER",
          level: 99,
          description: "Utilisateur standard",
          permissions: {},
          restrictions: {},
          isSystem: true,
          isActive: true,
        },
      });

      for (const oldAdmin of existingSuperAdmins) {
        await tx.user.update({
          where: { id: oldAdmin.id },
          data: { role: "USER" },
        });

        await tx.roleAssignment.upsert({
          where: { userId: oldAdmin.id },
          update: { roleId: defaultRoleConfig.id, assignedAt: new Date() },
          create: { userId: oldAdmin.id, roleId: defaultRoleConfig.id },
        });

        console.log(`  ↓ Utilisateur rétrogradé en USER : ${oldAdmin.email}`);
      }
    }

    // C. Upsert de l'utilisateur Cible
    const user = await tx.user.upsert({
      where: { email },
      update: {
        name,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: "ACTIVE",
        role: "SUPER_ADMIN",
      },
      create: {
        name,
        email,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: "ACTIVE",
        role: "SUPER_ADMIN",
      },
    });

    // D. Assignation explicite du rôle (RoleAssignment)
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

    // E. Synchronisation BetterAuth Credential
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

    // F. Réinitialisation des sécurités (Déblocage d'urgence / Reset 2FA)
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

  console.log(`✓ Restauration/Création réussie du Super Admin Unique : ${email}`);
  console.log("  - Rôle : SUPER_ADMIN (Level 1)");
  console.log("  - Statut : ACTIF, email vérifié, 2FA réinitialisé");
  console.log("  - Garantie d'unicité : Validée en transaction atomique");
}

main()
  .then(() => import("../lib/prisma"))
  .then(({ prisma }) => prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ Échec critique de la restauration du Super Admin :", e.message || e);
    const { prisma } = await import("../lib/prisma");
    await prisma.$disconnect();
    process.exit(1);
  });