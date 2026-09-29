// scripts/check-db-config.ts
// ============================================
// DIAGNOSTIC — CONNEXION POSTGRESQL (Prisma / @prisma/adapter-pg)
// ============================================
// Vérifie SANS démarrer Next.js :
//   1. la présence de DIRECT_URL / DATABASE_URL ;
//   2. l'absence de gabarits non remplacés (« <REGION> », « <MOT_DE_PASSE_POSTGRES> »),
//      cause exacte du « Invalid URL » (ERR_INVALID_URL) remonté par Prisma ;
//   3. la connexion réelle, via le MÊME client que l'application (lib/prisma).
//
// Usage : npm run db:check
// Code de sortie : 0 si tout est OK, 1 sinon (utilisable en CI).

import { config } from "dotenv";

// .env.local écrase .env (comportement Next.js).
config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main(): Promise<void> {
  const {
    POSTGRES_CONNECTION_ENV_KEYS,
    describePostgresTarget,
    maskPostgresConnectionString,
    resolvePostgresConnectionString,
  } = await import("../lib/prisma-connection");

  console.log("— Variables lues —");
  for (const key of POSTGRES_CONNECTION_ENV_KEYS) {
    const raw = process.env[key]?.trim();
    console.log(
      raw
        ? `  ${key} : ${maskPostgresConnectionString(raw)}`
        : `  ${key} : absente (ou vide)`,
    );
  }

  const target = resolvePostgresConnectionString();
  console.log(
    `\n✓ Chaîne analysable — ${target.key} → ${describePostgresTarget(target.connectionString)}`,
  );

  // Import APRÈS le chargement des variables : le pool est créé ici, comme dans Next.js.
  const { prisma } = await import("../lib/prisma");

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✓ Connexion PostgreSQL établie (SELECT 1).");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("\n✗ Configuration PostgreSQL inutilisable :\n");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
