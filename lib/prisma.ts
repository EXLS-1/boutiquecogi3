// lib/prisma.ts

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";

import { resolvePostgresConnectionString } from "./prisma-connection";

type PrismaGlobal = {
  prisma?: PrismaClient;
  pool?: Pool;
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;

// Résolution + validation fail-fast de la chaîne de connexion.
// DIRECT_URL est privilégiée (le pooler « session » est compatible avec l'adaptateur
// Prisma, contrairement à PgBouncer en mode transaction) ; repli sur DATABASE_URL.
//
// Sans cette validation, un gabarit non remplacé (ex. `aws-0-<REGION>`) ne ferait
// échouer la connexion qu'à la première requête, sur un « Invalid URL »
// (ERR_INVALID_URL) opaque remonté par Prisma — cf. lib/prisma-connection.ts.
const { connectionString } = resolvePostgresConnectionString();

const poolOptions: PoolConfig = {
  connectionString,
  max: Number(process.env.PG_POOL_MAX) || 20,
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 30_000,
};

const wantsSsl =
  process.env.DATABASE_SSL === "true" ||
  process.env.PGSSLMODE === "require" ||
  process.env.POSTGRES_SSL === "true";

if (wantsSsl) {
  poolOptions.ssl = { rejectUnauthorized: false };
}

const pool = globalForPrisma.pool ?? new Pool(poolOptions);
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: connectionString,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// En mode développement, on attache le pool ET le client à globalThis
// pour éviter les fuites de connexions au hot-reload.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
