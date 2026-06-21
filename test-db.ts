import { prisma } from "@/lib/prisma";

async function test() {
  try {
    const result = await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Connexion OK", result);
    
  } catch (e) {
    console.error("❌ Erreur connexion:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();