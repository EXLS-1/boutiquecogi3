// scripts/fix-broken-accounts.ts
// ============================================
// Script de réparation des comptes utilisateur BetterAuth
// Execute: npx tsx scripts/fix-broken-accounts.ts
// ============================================
// Problème identifié :
//   - Le modèle Prisma Account avait `user User[]` (array) au lieu de `user User`
//   - Le champ `provider` était mappé avec @map("providerAccountId") sans séparation
//   - Cela causait `Credential account not found` et `422` lors de l'inscription
//
// Ce script :
//   1. Supprime les comptes orphelins (sans userId valide)
//   2. Définit le type='email' pour les comptes credential
//   3. Réinitialise les comptes credentials existants

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Début de la réparation des comptes BetterAuth...\n");

  // 1. Nettoyer les comptes orphelins (userId inexistant)
  console.log("1️⃣  Vérification des comptes orphelins...");
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

  // 2. Définir type='email' pour tous les comptes sans type ou avec type vide
  console.log("\n2️⃣  Correction du type des comptes...");
  const result = await prisma.$executeRawUnsafe(`
    UPDATE "account"
    SET "type" = 'email'
    WHERE "type" IS NULL OR "type" = '' OR "type" = 'credential'
  `);
  console.log(`   ✅ ${result} comptes mis à jour avec type='email'`);

  // 3. Compter et afficher les stats
  console.log("\n3️⃣  Statistiques des comptes après réparation:");
  const stats = await prisma.$queryRawUnsafe<
    Array<{ type: string; count: bigint }>
  >(`
    SELECT "type", COUNT(*) as count
    FROM "account"
    GROUP BY "type"
    ORDER BY "type"
  `);
  for (const stat of stats) {
    console.log(`   - ${stat.type}: ${stat.count}`);
  }

  const total = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(`
    SELECT COUNT(*) as total FROM "account"
  `);
  console.log(`   Total: ${total[0].total}`);

  console.log("\n✅ Réparation terminée avec succès!");
}

main()
  .catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
