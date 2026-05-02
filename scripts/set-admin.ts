import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setAdmin(email: string) {
  try {
    // 1. Recherche de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ Erreur : Aucun utilisateur trouvé avec l'email : ${email}`);
      return;
    }

    // 2. Mise à jour du rôle
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        role: "admin", // Doit correspondre à la valeur attendue par Better-Auth
      },
    });

    console.log(`✅ Succès : L'utilisateur ${updatedUser.email} est désormais "admin".`);
  } catch (error) {
    console.error("❌ Erreur lors de la migration :", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Récupération de l'email via les arguments de la ligne de commande
const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error("⚠️ Usage : npx tsx scripts/set-admin.ts <email>");
  process.exit(1);
}

setAdmin(targetEmail);