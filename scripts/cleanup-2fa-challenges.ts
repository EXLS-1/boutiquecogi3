/**
 * Cleanup script for expired 2FA challenges.
 * 
 * Usage:
 *   npx tsx scripts/cleanup-2fa-challenges.ts
 * 
 * Cron recommendation (Vercel):
 *   "0 */6 * * *" — every 6 hours
 */

import { prisma } from "@/lib/prisma";

async function main() {
  console.log("🧹 Nettoyage des challenges 2FA expirés...");

  const result = await prisma.verification.deleteMany({
    where: {
      type: "TWO_FACTOR",
      consumedAt: null,
      expiresAt: { lt: new Date() },
    },
  });

  console.log(`   ${result.count} challenges 2FA expirés supprimés`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
