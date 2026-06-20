import { prisma } from "@/lib/prisma";
import { main as runSeed } from "@/prisma/seed/index";

async function main() {
  await runSeed();
}

main()
  .catch((e) => {
    console.error("❌ Erreur critique lors du seed :");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });