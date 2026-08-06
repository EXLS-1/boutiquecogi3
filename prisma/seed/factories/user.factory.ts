// prisma/seed/factories/user.factory.ts
// ============================================
// GÉNÉRATEUR D'UTILISATEURS & COMPTES BETTERAUTH
// ============================================
// UUID v7 déterministes + hash statique mis en cache pour éviter le coût
// de hachage répété. Distribution des rôles par index.

import { Role } from "@prisma/client";
import { generateDeterministicUuidV7 } from "../utils/uuid";
import { getStaticPasswordHash } from "../utils/hash";
import { makeSlug } from "../utils/slug";

export interface GeneratedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  roleLevel: number;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  account: {
    id: string;
    userId: string;
    providerId: string;
    accountId: string;
    password: string;
    type: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

/** Rôle associé à chaque niveau (aligné sur @/lib/auth/rbac). */
const LEVEL_TO_ROLE: Record<number, Role> = {
  1: Role.SUPER_ADMIN,
  2: Role.ADMIN,
  3: Role.MANAGER,
  4: Role.EDITOR,
  5: Role.SUPERVISOR,
  6: Role.USER,
  7: Role.GUEST,
};

export interface BuildUserOptions {
  roleLevel?: number;
  emailPrefix?: string;
  name?: string;
  emailVerified?: boolean;
}

/**
 * Construit un utilisateur + son compte BetterAuth (credential).
 * Déterministe : mêmes index -> mêmes IDs.
 */
export async function buildUserFactory(
  index: number,
  options: BuildUserOptions = {},
): Promise<GeneratedUser> {
  const userId = generateDeterministicUuidV7("user", index);
  const accountId = generateDeterministicUuidV7("account", index);

  const roleLevel = options.roleLevel ?? (index === 0 ? 1 : 6);
  const role = LEVEL_TO_ROLE[roleLevel] ?? Role.USER;

  const emailPrefix =
    options.emailPrefix ?? (roleLevel === 1 ? "admin" : `user${index}`);
  const email = `${emailPrefix}@boutiquecogi3.cd`;
  const name =
    options.name ?? (role === Role.SUPER_ADMIN ? `SuperAdmin ${index}` : `Client RDC ${index}`);

  const password = await getStaticPasswordHash();
  const createdAt = new Date(Date.now() - index * 3600000);

  return {
    id: userId,
    name,
    email,
    role,
    roleLevel,
    emailVerified: options.emailVerified ?? true,
    createdAt,
    updatedAt: createdAt,
    account: {
      id: accountId,
      userId,
      providerId: "credential",
      accountId: userId, // BetterAuth: accountId = userId pour les credentials locaux
      password,
      type: "email",
      createdAt,
      updatedAt: createdAt,
    },
  };
}

/** Slug unique pour un utilisateur (déterministe). */
export function userSlug(index: number): string {
  return makeSlug(`user-${index}`, index);
}

/**
 * Construit un lot d'utilisateurs avec distribution de rôles :
 * index 0 -> SUPER_ADMIN (L1), 1 -> ADMIN (L2), 2 -> MANAGER (L3),
 * 3 -> EDITOR (L4), 4 -> SUPERVISOR (L5), reste -> USER (L6).
 */
export async function buildUsersBatch(count: number): Promise<GeneratedUser[]> {
  const users: GeneratedUser[] = [];
  for (let i = 0; i < count; i++) {
    let roleLevel = 6;
    if (i === 0) roleLevel = 1;
    else if (i === 1) roleLevel = 2;
    else if (i === 2) roleLevel = 3;
    else if (i === 3) roleLevel = 4;
    else if (i === 4) roleLevel = 5;

    users.push(await buildUserFactory(i, { roleLevel }));
  }
  return users;
}
