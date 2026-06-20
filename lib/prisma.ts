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
// or `PGSSLMODE=require`. We set `rejectUnauthorized: false` to support
// managed providers that use self-signed certificates for connections.
if (
  process.env.DATABASE_SSL === "true" ||
  process.env.PGSSLMODE === "require"
) {
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
