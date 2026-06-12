// prisma/seed/roles.seed.ts
import { PrismaClient } from "@prisma/client";

export async function seedRoles(prisma: PrismaClient) {
  console.log("👥 Configuration des rôles...");

  const roles = ["admin", "user", "manager"];

  // Note: Si votre schéma ne possède pas de table Role,
  // ce script peut servir à valider des permissions ou être omis.
  // Ici, nous supposons une approche extensible.
  return roles;
}
