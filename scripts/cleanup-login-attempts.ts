/**
 * Cleanup script for expired login/2FA attempts (older than 24h).
 * Usage: npx tsx scripts/cleanup-login-attempts.ts
 * Cron: every 6 hours
 */

import { prisma } from "@/lib/prisma";

const RETENTION_HOURS = 24;

async function main() {
  console.log("Nettoyage des tentatives de connexion...");

  const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000);

  const [loginResult, twoFaResult] = await Promise.all([
    prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.twoFactorAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ]);

  console.log(`  ${loginResult.count} tentatives de connexion supprimees`);
  console.log(`  ${twoFaResult.count} tentatives 2FA supprimees`);
}

main()
  .catch((e) => {
    console.error("Erreur:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
