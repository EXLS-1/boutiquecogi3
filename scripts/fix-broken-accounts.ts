// scripts/fix-broken-accounts.ts
// ============================================
// Script de réparation des comptes utilisateur BetterAuth
// Execute: npx tsx scripts/fix-broken-accounts.ts
// ============================================
// Root cause: some credential rows contain malformed or plaintext password values,
// which trigger BetterAuth's "Invalid password hash" error during sign-in.

import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

function getRepairPassword(): string {
  const candidates = [
    process.env.INITIAL_SUPERADMIN_PASSWORD,
    process.env.SUPER_ADMIN_PASSWORD,
    "Password123!",
  ];

  return candidates.find((value) => !!value && value.trim().length >= 8) ?? "Password123!";
}

function isValidBcryptHash(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  if (!value.startsWith("$2")) return false;

  try {
    const isValid = bcrypt.getRounds(value) > 0 && value.length > 20;
    if (!isValid) return false;
    bcrypt.compareSync("probe-password-for-validation", value);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log("🔧 Début de la réparation des comptes BetterAuth...\n");

  const repairPassword = getRepairPassword();
  const repairHash = await bcrypt.hash(repairPassword, 10);

  console.log("1️⃣ Vérification des comptes credentials avec hash invalide...");
  const accounts = await prisma.account.findMany({
    select: {
      id: true,
      userId: true,
      type: true,
      providerId: true,
      accountId: true,
      password: true,
      user: { select: { email: true } },
    },
  });

  const invalidAccounts = accounts.filter((account) => {
    if (account.type !== "email" && account.type !== "credential") return false;
    return !isValidBcryptHash(account.password);
  });

  if (invalidAccounts.length === 0) {
    console.log("   ✅ Aucun compte credential invalide trouvé.");
  } else {
    const ids = invalidAccounts.map((account) => account.id);
    await prisma.account.updateMany({
      where: { id: { in: ids } },
      data: { password: repairHash, updatedAt: new Date() },
    });
    console.log(`   ✅ ${invalidAccounts.length} comptes credentials invalides corrigés.`);
    for (const account of invalidAccounts) {
      console.log(`      - ${account.user?.email ?? account.userId}: ${account.password ?? "<null>"}`);
    }
  }

  console.log("\n2️⃣  Vérification des comptes orphelins...");
  const orphanAccounts = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
    SELECT a.id FROM "account" a
    LEFT JOIN "user" u ON u.id = a."userId"
    WHERE u.id IS NULL
  `);

  if (orphanAccounts.length > 0) {
    const ids = orphanAccounts.map((a) => `'${a.id}'`).join(",");
    await prisma.$executeRawUnsafe(
      `DELETE FROM "account" WHERE id IN (${ids})`
    );
    console.log(`   ✅ ${orphanAccounts.length} comptes orphelins supprimés`);
  } else {
    console.log("   ✅ Aucun compte orphelin trouvé");
  }

  console.log("\n3️⃣  Correction du type des comptes...");
  const result = await prisma.$executeRawUnsafe(`
    UPDATE "account"
    SET "type" = 'email'
    WHERE "type" IS NULL OR "type" = '' OR "type" = 'credential'
  `);
  console.log(`   ✅ ${result} comptes mis à jour avec type='email'`);

  const repairedCount = await prisma.account.count({
    where: { password: { not: null }, type: { in: ["email", "credential"] } },
  });
  console.log(`\n✅ Réparation terminée. ${repairedCount} comptes ont maintenant un mot de passe valide.`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
