// prisma/seed/users.seed.ts

import { PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/uuid";
import { hash } from "bcryptjs";
import { ROLES, type Role } from "@/lib/auth/rbac";

interface SeedUserOptions {
  email: string;
  password: string;
  name: string;
  role: Role;
}

const DEFAULT_SUPER_ADMIN: SeedUserOptions = {
  email: "excellentservice1exls@gmail.com",
  password: "@@@123Exls",
  name: "SuperAdmin Cogi",
  role: ROLES.SUPER_ADMIN,
};

export async function seedUsers(
  prisma: PrismaClient,
  options: Partial<SeedUserOptions> = {}
) {
  const config = { ...DEFAULT_SUPER_ADMIN, ...options };

  console.log(`👤 [RBAC] Création de l'administrateur (${config.role})...`);

  if (!Object.values(ROLES).includes(config.role)) {
    throw new Error(`[RBAC] Rôle invalide: ${config.role}. Attendu: ${Object.values(ROLES).join(", ")}`);
  }

  const superadmin = await prisma.user.upsert({
    where: { email: config.email },
    update: {
      role: config.role,
      emailVerified: new Date(),
      name: config.name,
    },
    create: {
      id: generateUUIDv7(),
      name: config.name,
      password: await hash(config.password, 10),
      email: config.email,
      emailVerified: new Date(),
      role: config.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`   ✓ Super Admin créé: ${superadmin.email} [${superadmin.role}]`);
  return superadmin;
}