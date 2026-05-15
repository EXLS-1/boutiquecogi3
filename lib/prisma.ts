import { PrismaClient } from "@prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Optimisation : limite les connexions simultanées
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// En mode développement, on attache l'instance à globalThis pour éviter les fuites de connexions
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}