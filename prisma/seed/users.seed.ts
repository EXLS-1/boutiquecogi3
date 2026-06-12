// prisma/seed/users.seed.ts

import { PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "./seed-helpers";

export async function seedUsers(prisma: PrismaClient) {
  console.log("👤 Création de l'administrateur par défaut...");

  // On utilise upsert pour éviter les doublons sur l'email
  const admin = await prisma.user.upsert({
    where: { email: "admin@boutiquecogi.com" },
    update: { role: "super-admin" },
    create: {
      id: generateUUIDv7(),
      name: "Admin Cogi",
      email: "admin@boutiquecogi.com",
      emailVerified: new Date(),
      role: "super-admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return admin;
}
