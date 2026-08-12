// prisma/seed.ts
// ============================================
// ENTRY POINT — Délègue au seed modulaire RBAC
// ============================================
// Le seed atomique canonique vit dans @/prisma/seed/index.ts.
// Ce fichier sert uniquement de point d'entrée pour Prisma CLI.

import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { main } from "@/prisma/seed/index";

main(prisma)
  .catch((e) => {
    console.error("❌ Seed échoué :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("🔌 Connexion Prisma fermée.");
  });

