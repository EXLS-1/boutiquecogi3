import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

// 1. Charger les variables d'environnement du fichier .env
dotenv.config();

const prisma = new PrismaClient();

async function setAdmin(email: string) {
  try {
    console.log(`🚀 Tentative de passage en ADMIN pour : ${email}`);

    // 2. Mise à jour avec la valeur de l'enum (doit être ADMIN en majuscules)
    const updatedUser = await prisma.user.update({
      where: { email: email },
      data: {
        role: "ADMIN", 
      },
    });

    console.log(`✅ Succès ! ${updatedUser.name || updatedUser.email} est maintenant ADMIN.`);
  } catch (error) {
    console.error("❌ Erreur de migration :");
    if (error instanceof Error) {
      console.error(error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error("⚠️ Usage : npx tsx scripts/set-admin.ts <email>");
  process.exit(1);
}

setAdmin(targetEmail);