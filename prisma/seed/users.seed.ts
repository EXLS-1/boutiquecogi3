// prisma/seed/users.seed.ts
//

import { PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/uuid";
import { hash } from "bcryptjs";

export async function seedUsers(
  prisma: PrismaClient,
  defaultAdminEmail: string,
) {
  console.log("👤 Création de l'administrateur par défaut...");

  // On utilise upsert pour éviter les doublons sur l'email
  const superadmin = await prisma.user.upsert({
    where: { email: defaultAdminEmail },
    update: {
      role: "SUPER_ADMIN",
      emailVerified: new Date(),
      name: "SuperAdmin Cogi",
    },
    create: {
      id: generateUUIDv7(),
      name: "SuperAdmin Cogi",
      password: await hash("@@@123Exls", 10),
      email: "excellentservice1exls@gmail.com",
      emailVerified: new Date(),
      role: "SUPER_ADMIN",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log("👤 Super Administrateur par défaut créé ou mis à jour.");
  return superadmin;
}
