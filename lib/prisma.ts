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

  // Limite le nombre de connexions simultanées du pool — augmenté pour éviter l'épuisement.
  max: Number(process.env.PG_POOL_MAX) || 20,

  // Temps max d'inactivité d'une connexion avant fermeture.
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 30_000,
};

// If the remote Postgres requires SSL, allow opt-in via env var `DATABASE_SSL=true`
// or `PGSSLMODE=require`.
//
// Some managed Postgres providers (and certain network setups) require SSL but do not
// always set PGSSLMODE for us. In that case, enabling SSL prevents runtime crashes
// with: "(ESSLREQUIRED) SSL connection is required for user: postgres".

//
// We set `rejectUnauthorized: false` to support managed providers that use
// self-signed certificates (common in staging environments).
const wantsSsl =
  process.env.DATABASE_SSL === "true" ||
  process.env.PGSSLMODE === "require" ||
  process.env.POSTGRES_SSL === "true";

if (wantsSsl) {
  poolOptions.ssl = { rejectUnauthorized: false };
}

// In development (Next.js + Turbopack hot reload), the module is re-evaluated on
// every change. Cache BOTH the pool and the client on globalThis so we never end
// up with multiple connection pools.
const pool =
  globalForPrisma.pool ??
  new Pool(poolOptions);

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// En mode développement, on attache le pool ET le client à globalThis
// pour éviter les fuites de connexions au hot-reload.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
  globalForPrisma.prisma = prisma;
}
