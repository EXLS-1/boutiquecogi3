// prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import { main as runSeed } from "@/prisma/seed/index";

const prisma = new PrismaClient();

/**
 * Entry point pour Prisma Seed.
 * Utilise l'orchestrateur modulaire situé dans @/prisma/seed/index.ts
 */
runSeed()
  .catch((e) => {
    console.error("❌ Erreur critique lors du seed :");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
