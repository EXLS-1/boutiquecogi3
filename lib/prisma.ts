// lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Use DIRECT_URL for the adapter (bypasses PgBouncer which is incompatible
// with Prisma's driver adapter). Fall back to DATABASE_URL if not set.
const poolOptions: any = {
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  max: 10, // Optimisation : limite les connexions simultanées
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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
  process.env.PGSSLMODE === "require" ||
  process.env.POSTGRES_SSL === "true";

if (wantsSsl) {
  poolOptions.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolOptions);

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

// En mode développement, on attache l'instance à globalThis pour éviter les fuites de connexions
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
