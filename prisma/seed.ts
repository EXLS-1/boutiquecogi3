import { PrismaClient } from "@prisma/client";
import { main as runSeed } from "@/prisma/seed/index";

const prisma = new PrismaClient();

runSeed()
  .catch((e) => {
    console.error("❌ Erreur critique lors du seed :");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });