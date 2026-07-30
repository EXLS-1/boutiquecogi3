// lib/auth/rbac-client.ts
// ============================================
// RBAC CLIENT-SIDE — Permissions et restrictions résolues sans serveur
// ============================================
// Importé UNIQUEMENT par les Client Components.
// NE JAMAIS importer session-provider.ts, next/headers, Prisma, etc.
// Utilise DEFAULT_ROLE_CONFIG (purement statique) pour résoudre les permissions.

import {
  LEVELS,
  ROLE_TO_LEVEL,
  LEVEL_TO_ROLE,
  DEFAULT_ROLE_CONFIG,
  type Role,
  type Permission,
  type Restriction,
  type ToggleState,
} from "@/lib/auth/rbac-shared";

// ─── Résolution des permissions (uniquement via DEFAULT_ROLE_CONFIG) ───

/**
 * Résout les permissions effectives pour un rôle donné.
 * Version client-safe basée uniquement sur DEFAULT_ROLE_CONFIG.
 * N'utilise PAS Prisma ni la session.
 */
export function getClientPermissions(role: Role): Permission[] {
  const userLevel = getRoleLevel(role);
  const effectivePerms = new Set<Permission>();

  for (let level = userLevel; level <= LEVELS.LEVEL_7; level++) {
    const levelRole = LEVEL_TO_ROLE[level];
    const config = DEFAULT_ROLE_CONFIG[levelRole];
    if (!config) continue;

    for (const [perm, state] of Object.entries(config.permissions)) {
      if (state === "ON") {
        effectivePerms.add(perm as Permission);
      }
    }
  }

  return Array.from(effectivePerms);
}

/**
 * Résout les restrictions effectives pour un rôle donné.
 * Version client-safe basée uniquement sur DEFAULT_ROLE_CONFIG.
 * N'utilise PAS Prisma ni la session.
 */
export function getClientRestrictions(
  role: Role,
): Record<Restriction, string | ToggleState> {
  const userLevel = getRoleLevel(role);
  const effectiveRestr = new Map<Restriction, string | ToggleState>();

  for (let level = LEVELS.LEVEL_7; level >= userLevel; level--) {
    const levelRole = LEVEL_TO_ROLE[level];
    const config = DEFAULT_ROLE_CONFIG[levelRole];
    if (!config) continue;

    for (const [restr, value] of Object.entries(config.restrictions)) {
      if (!effectiveRestr.has(restr as Restriction)) {
        effectiveRestr.set(restr as Restriction, value);
      }
    }
  }

  return Object.fromEntries(effectiveRestr) as Record<
    Restriction,
    string | ToggleState
  >;
}

function getRoleLevel(role: Role): number {
  return ROLE_TO_LEVEL[role] ?? LEVELS.LEVEL_7;
}

