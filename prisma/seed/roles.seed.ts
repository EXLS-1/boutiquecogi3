import { PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/uuid";

export const ROLE_DEFINITIONS = [
  {
    name: "SUPER_ADMIN",
    level: 1,
    description: "Contrôle total sans restriction. Peut tout voir, tout modifier, tout supprimer.",
    isSystem: true,
  },
  {
    name: "ADMIN",
    level: 2,
    description: "Administration globale sauf maintenance système et impersonation.",
    isSystem: true,
  },
  {
    name: "MANAGER",
    level: 3,
    description: "Gestion opérationnelle : produits, commandes, équipe, analytics.",
    isSystem: true,
  },
  {
    name: "EDITOR",
    level: 4,
    description: "Création et modification de contenu, médias, catalogue lecture seule.",
    isSystem: true,
  },
  {
    name: "SUPERVISOR",
    level: 5,
    description: "Supervision des commandes, modération, rapports opérationnels.",
    isSystem: true,
  },
  {
    name: "USER",
    level: 6,
    description: "Client standard. Achats, consultation, gestion de son profil.",
    isSystem: true,
  },
] as const;

export type RoleName = (typeof ROLE_DEFINITIONS)[number]["name"];

export async function seedRoles(prisma: PrismaClient) {
  console.log("👥 [RBAC] Configuration des 6 rôles hiérarchiques...");

  const roleMap = new Map<string, string>();

  for (const roleDef of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {
        level: roleDef.level,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
      },
      create: {
        id: generateUUIDv7(),
        name: roleDef.name,
        level: roleDef.level,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
      },
    });

    roleMap.set(roleDef.name, role.id);
    console.log(`   ✓ ${roleDef.name} (Level ${roleDef.level}) → ${role.id}`);
  }

  console.log(`👥 [RBAC] ${roleMap.size} rôles synchronisés.`);
  return roleMap as Map<RoleName, string>;
}