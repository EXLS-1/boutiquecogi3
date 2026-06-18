// /lib/auth/rbac.ts
// ============================================
// RBAC SERVER-SIDE — HIERARCHIE STRICTE LEVEL 1-6
// ============================================
// Ce fichier est PUREMENT server-side. Aucun 'use client'.
// Il est importé uniquement dans : Server Components, Server Actions, Route Handlers, Middleware.

"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

// ───────────────────────────────────────────
// 1. TYPES & CONSTANTS
// ───────────────────────────────────────────

export type Role = (typeof ROLES)[keyof typeof ROLES];
export type Level = (typeof LEVELS)[keyof typeof LEVELS];
export type ToggleState = "ON" | "OFF";

/**
 * Hiérarchie des rôles : Level 1 = TOP (tous les pouvoirs)
 * Chaque niveau hérite de TOUS les permissions du niveau inférieur.
 */
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN", // Level 1 — Sans restriction
  ADMIN: "ADMIN", // Level 2
  MANAGER: "MANAGER", // Level 3
  EDITOR: "EDITOR", // Level 4
  SUPERVISOR: "SUPERVISOR", // Level 5
  USER: "USER", // Level 6 — Rôle par défaut
} as const;

export const LEVELS = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
  LEVEL_5: 5,
  LEVEL_6: 6,
} as const;

const ROLE_TO_LEVEL: Record<Role, number> = {
  [ROLES.SUPER_ADMIN]: LEVELS.LEVEL_1,
  [ROLES.ADMIN]: LEVELS.LEVEL_2,
  [ROLES.MANAGER]: LEVELS.LEVEL_3,
  [ROLES.EDITOR]: LEVELS.LEVEL_4,
  [ROLES.SUPERVISOR]: LEVELS.LEVEL_5,
  [ROLES.USER]: LEVELS.LEVEL_6,
};

const LEVEL_TO_ROLE: Record<number, Role> = {
  [LEVELS.LEVEL_1]: ROLES.SUPER_ADMIN,
  [LEVELS.LEVEL_2]: ROLES.ADMIN,
  [LEVELS.LEVEL_3]: ROLES.MANAGER,
  [LEVELS.LEVEL_4]: ROLES.EDITOR,
  [LEVELS.LEVEL_5]: ROLES.SUPERVISOR,
  [LEVELS.LEVEL_6]: ROLES.USER,
};

// ───────────────────────────────────────────
// 2. PERMISSIONS EXHAUSTIVES (Domain:Action)
// ───────────────────────────────────────────

export const PERMISSIONS = {
  // ── Users ──
  USERS_READ: "users:read",
  USERS_CREATE: "users:create",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
  USERS_BAN: "users:ban",
  USERS_IMPERSONATE: "users:impersonate",

  // ── Products ──
  PRODUCTS_READ: "products:read",
  PRODUCTS_CREATE: "products:create",
  PRODUCTS_UPDATE: "products:update",
  PRODUCTS_DELETE: "products:delete",
  PRODUCTS_BULK_EDIT: "products:bulk-edit",
  PRODUCTS_IMPORT: "products:import",
  PRODUCTS_EXPORT: "products:export",

  // ── Orders ──
  ORDERS_READ: "orders:read",
  ORDERS_CREATE: "orders:create",
  ORDERS_UPDATE: "orders:update",
  ORDERS_DELETE: "orders:delete",
  ORDERS_REFUND: "orders:refund",
  ORDERS_CANCEL: "orders:cancel",

  // ── Categories ──
  CATEGORIES_READ: "categories:read",
  CATEGORIES_CREATE: "categories:create",
  CATEGORIES_UPDATE: "categories:update",
  CATEGORIES_DELETE: "categories:delete",

  // ── Analytics & Reports ──
  ANALYTICS_READ: "analytics:read",
  ANALYTICS_EXPORT: "analytics:export",
  REPORTS_GENERATE: "reports:generate",
  REPORTS_SCHEDULE: "reports:schedule",

  // ── Settings ──
  SETTINGS_READ: "settings:read",
  SETTINGS_UPDATE: "settings:update",
  SETTINGS_BILLING: "settings:billing",
  SETTINGS_ROLES_MANAGE: "settings:roles-manage",

  // ── Media / Storage ──
  MEDIA_UPLOAD: "media:upload",
  MEDIA_DELETE: "media:delete",
  MEDIA_READ: "media:read",

  // ── System ──
  SYSTEM_LOGS: "system:logs",
  SYSTEM_MAINTENANCE: "system:maintenance",
  SYSTEM_BACKUP: "system:backup",

  // ── Content ──
  CONTENT_READ: "content:read",
  CONTENT_CREATE: "content:create",
  CONTENT_UPDATE: "content:update",
  CONTENT_DELETE: "content:delete",
  CONTENT_PUBLISH: "content:publish",
  CONTENT_MODERATE: "content:moderate",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ───────────────────────────────────────────
// 3. RESTRICTIONS (Contraintes configurables)
// ───────────────────────────────────────────

export const RESTRICTIONS = {
  // ── Quotas ──
  MAX_DAILY_ORDERS: "max_daily_orders",
  MAX_PRODUCTS_PER_USER: "max_products_per_user",
  MAX_STORAGE_MB: "max_storage_mb",
  MAX_TEAM_MEMBERS: "max_team_members",

  // ── Feature Flags ──
  CAN_ACCESS_API: "can_access_api",
  CAN_ACCESS_WEBHOOKS: "can_access_webhooks",
  CAN_ACCESS_ADVANCED_ANALYTICS: "can_access_advanced_analytics",
  CAN_EXPORT_DATA: "can_export_data",
  CAN_USE_BULK_ACTIONS: "can_use_bulk_actions",

  // ── Scope ──
  RESTRICTED_TO_OWN_DATA: "restricted_to_own_data",
  RESTRICTED_TO_DEPARTMENT: "restricted_to_department",

  // ── Time & Rate ──
  RATE_LIMIT_PER_MINUTE: "rate_limit_per_minute",
  SESSION_DURATION_HOURS: "session_duration_hours",

  // ── Security ──
  REQUIRE_2FA: "require_2fa",
  REQUIRE_APPROVAL_FOR_DELETE: "require_approval_for_delete",
} as const;

export type Restriction = (typeof RESTRICTIONS)[keyof typeof RESTRICTIONS];

// ───────────────────────────────────────────
// 4. CONFIGURATION PAR DÉFAUT DES RÔLES
// ───────────────────────────────────────────

/**
 * Helper pour générer un objet de permissions complet avec des surcharges.
 */
function createPermissions(
  overrides: Partial<Record<Permission, ToggleState>> = {},
  defaultState: ToggleState = "OFF",
): Record<Permission, ToggleState> {
  const base = Object.fromEntries(
    Object.values(PERMISSIONS).map((p) => [p, defaultState]),
  ) as Record<Permission, ToggleState>;

  return { ...base, ...overrides };
}

/**
 * Helper pour générer un objet de restrictions complet avec des surcharges.
 */
function createRestrictions(
  overrides: Partial<Record<Restriction, string | ToggleState>> = {},
  defaultState: string | ToggleState = "OFF",
): Record<Restriction, string | ToggleState> {
  const base = Object.fromEntries(
    Object.values(RESTRICTIONS).map((r) => [r, defaultState]),
  ) as Record<Restriction, string | ToggleState>;

  return { ...base, ...overrides };
}

/**
 * Configuration immuable des permissions par défaut.
 * Level 1 = TOUT activé, aucune restriction.
 * Chaque niveau inférieur hérite + peut avoir des restrictions.
 */
const DEFAULT_ROLE_CONFIG: Record<
  Role,
  {
    level: Level;
    permissions: Record<Permission, ToggleState>;
    restrictions: Record<Restriction, string | ToggleState>;
  }
> = {
  [ROLES.SUPER_ADMIN]: {
    level: LEVELS.LEVEL_1,
    permissions: createPermissions({}, "ON"),
    restrictions: createRestrictions({}, "OFF"),
  },

  [ROLES.ADMIN]: {
    level: LEVELS.LEVEL_2,
    permissions: createPermissions(
      {
        [PERMISSIONS.SYSTEM_MAINTENANCE]: "OFF",
        [PERMISSIONS.SYSTEM_BACKUP]: "OFF",
        [PERMISSIONS.USERS_IMPERSONATE]: "OFF",
      },
      "ON",
    ),
    restrictions: createRestrictions(
      {
        [RESTRICTIONS.REQUIRE_APPROVAL_FOR_DELETE]: "ON",
      },
      "OFF",
    ),
  },

  [ROLES.MANAGER]: {
    level: LEVELS.LEVEL_3,
    permissions: createPermissions({
      [PERMISSIONS.USERS_READ]: "ON",
      [PERMISSIONS.USERS_UPDATE]: "ON",
      [PERMISSIONS.USERS_BAN]: "ON",
      [PERMISSIONS.PRODUCTS_READ]: "ON",
      [PERMISSIONS.PRODUCTS_CREATE]: "ON",
      [PERMISSIONS.PRODUCTS_UPDATE]: "ON",
      [PERMISSIONS.PRODUCTS_BULK_EDIT]: "ON",
      [PERMISSIONS.PRODUCTS_IMPORT]: "ON",
      [PERMISSIONS.ORDERS_READ]: "ON",
      [PERMISSIONS.ORDERS_UPDATE]: "ON",
      [PERMISSIONS.ORDERS_REFUND]: "ON",
      [PERMISSIONS.ORDERS_CANCEL]: "ON",
      [PERMISSIONS.CATEGORIES_READ]: "ON",
      [PERMISSIONS.CATEGORIES_CREATE]: "ON",
      [PERMISSIONS.CATEGORIES_UPDATE]: "ON",
      [PERMISSIONS.ANALYTICS_READ]: "ON",
      [PERMISSIONS.ANALYTICS_EXPORT]: "ON",
      [PERMISSIONS.REPORTS_GENERATE]: "ON",
      [PERMISSIONS.SETTINGS_READ]: "ON",
      [PERMISSIONS.MEDIA_UPLOAD]: "ON",
      [PERMISSIONS.MEDIA_DELETE]: "ON",
      [PERMISSIONS.MEDIA_READ]: "ON",
      [PERMISSIONS.SYSTEM_LOGS]: "ON",
      [PERMISSIONS.CONTENT_READ]: "ON",
      [PERMISSIONS.CONTENT_CREATE]: "ON",
      [PERMISSIONS.CONTENT_UPDATE]: "ON",
      [PERMISSIONS.CONTENT_PUBLISH]: "ON",
      [PERMISSIONS.CONTENT_MODERATE]: "ON",
    }),
    restrictions: createRestrictions({
      [RESTRICTIONS.MAX_DAILY_ORDERS]: "100",
      [RESTRICTIONS.MAX_PRODUCTS_PER_USER]: "500",
      [RESTRICTIONS.MAX_STORAGE_MB]: "2048",
      [RESTRICTIONS.MAX_TEAM_MEMBERS]: "20",
      [RESTRICTIONS.CAN_ACCESS_API]: "ON",
      [RESTRICTIONS.CAN_ACCESS_WEBHOOKS]: "ON",
      [RESTRICTIONS.CAN_ACCESS_ADVANCED_ANALYTICS]: "ON",
      [RESTRICTIONS.CAN_EXPORT_DATA]: "ON",
      [RESTRICTIONS.CAN_USE_BULK_ACTIONS]: "ON",
      [RESTRICTIONS.RATE_LIMIT_PER_MINUTE]: "120",
      [RESTRICTIONS.SESSION_DURATION_HOURS]: "12",
    }),
  },

  [ROLES.EDITOR]: {
    level: LEVELS.LEVEL_4,
    permissions: createPermissions({
      [PERMISSIONS.PRODUCTS_READ]: "ON",
      [PERMISSIONS.PRODUCTS_UPDATE]: "ON",
      [PERMISSIONS.CATEGORIES_READ]: "ON",
      [PERMISSIONS.ANALYTICS_READ]: "ON",
      [PERMISSIONS.MEDIA_UPLOAD]: "ON",
      [PERMISSIONS.MEDIA_READ]: "ON",
      [PERMISSIONS.CONTENT_READ]: "ON",
      [PERMISSIONS.CONTENT_CREATE]: "ON",
      [PERMISSIONS.CONTENT_UPDATE]: "ON",
      [PERMISSIONS.CONTENT_PUBLISH]: "ON",
    }),
    restrictions: createRestrictions({
      [RESTRICTIONS.MAX_DAILY_ORDERS]: "20",
      [RESTRICTIONS.MAX_PRODUCTS_PER_USER]: "100",
      [RESTRICTIONS.MAX_STORAGE_MB]: "512",
      [RESTRICTIONS.MAX_TEAM_MEMBERS]: "5",
      [RESTRICTIONS.CAN_ACCESS_API]: "ON",
      [RESTRICTIONS.RESTRICTED_TO_OWN_DATA]: "ON",
      [RESTRICTIONS.RATE_LIMIT_PER_MINUTE]: "60",
      [RESTRICTIONS.SESSION_DURATION_HOURS]: "8",
    }),
  },

  [ROLES.SUPERVISOR]: {
    level: LEVELS.LEVEL_5,
    permissions: createPermissions({
      [PERMISSIONS.ORDERS_READ]: "ON",
      [PERMISSIONS.ORDERS_UPDATE]: "ON",
      [PERMISSIONS.ORDERS_CANCEL]: "ON",
      [PERMISSIONS.PRODUCTS_READ]: "ON",
      [PERMISSIONS.ANALYTICS_READ]: "ON",
      [PERMISSIONS.REPORTS_GENERATE]: "ON",
      [PERMISSIONS.MEDIA_READ]: "ON",
      [PERMISSIONS.CONTENT_READ]: "ON",
      [PERMISSIONS.CONTENT_MODERATE]: "ON",
    }),
    restrictions: createRestrictions({
      [RESTRICTIONS.MAX_DAILY_ORDERS]: "50",
      [RESTRICTIONS.MAX_PRODUCTS_PER_USER]: "50",
      [RESTRICTIONS.MAX_STORAGE_MB]: "256",
      [RESTRICTIONS.CAN_ACCESS_API]: "ON",
      [RESTRICTIONS.CAN_EXPORT_DATA]: "ON",
      [RESTRICTIONS.RESTRICTED_TO_OWN_DATA]: "ON",
      [RESTRICTIONS.RESTRICTED_TO_DEPARTMENT]: "ON",
      [RESTRICTIONS.RATE_LIMIT_PER_MINUTE]: "45",
      [RESTRICTIONS.SESSION_DURATION_HOURS]: "8",
    }),
  },

  [ROLES.USER]: {
    level: LEVELS.LEVEL_6,
    permissions: createPermissions({
      [PERMISSIONS.PRODUCTS_READ]: "ON",
      [PERMISSIONS.ORDERS_READ]: "ON",
      [PERMISSIONS.ORDERS_CREATE]: "ON",
      [PERMISSIONS.CATEGORIES_READ]: "ON",
      [PERMISSIONS.MEDIA_READ]: "ON",
      [PERMISSIONS.CONTENT_READ]: "ON",
      [PERMISSIONS.SETTINGS_READ]: "ON",
    }),
    restrictions: createRestrictions({
      [RESTRICTIONS.MAX_DAILY_ORDERS]: "5",
      [RESTRICTIONS.MAX_PRODUCTS_PER_USER]: "0",
      [RESTRICTIONS.MAX_STORAGE_MB]: "50",
      [RESTRICTIONS.MAX_TEAM_MEMBERS]: "1",
      [RESTRICTIONS.RESTRICTED_TO_OWN_DATA]: "ON",
      [RESTRICTIONS.RATE_LIMIT_PER_MINUTE]: "20",
      [RESTRICTIONS.SESSION_DURATION_HOURS]: "4",
    }),
  },
};

// ───────────────────────────────────────────
// 5. FONCTIONS UTILITAIRES
// ───────────────────────────────────────────

/**
 * Normalise un rôle string en Role valide.
 * Fallback sur USER si invalide.
 */
export function normalizeRole(role: string | null | undefined): Role {
  if (!role) return ROLES.USER;
  const normalized = role.toUpperCase().trim();
  return Object.values(ROLES).includes(normalized as Role)
    ? (normalized as Role)
    : ROLES.USER;
}

/**
 * Retourne le niveau numérique d'un rôle.
 */
export function getRoleLevel(role: Role): number {
  return ROLE_TO_LEVEL[role] ?? LEVELS.LEVEL_6;
}

/**
 * Vérifie si roleA est hiérarchiquement supérieur ou égal à roleB.
 * Level 1 > Level 2 > ... > Level 6
 */
export function isRoleAboveOrEqual(roleA: Role, roleB: Role): boolean {
  return getRoleLevel(roleA) <= getRoleLevel(roleB);
}

/**
 * Vérifie si un rôle peut manager un autre rôle.
 * Un manager ne peut manager que des rôles de niveau STRICTEMENT inférieur.
 */
export function canManageRole(managerRole: Role, targetRole: Role): boolean {
  return getRoleLevel(managerRole) < getRoleLevel(targetRole);
}

// ───────────────────────────────────────────
// 6. RÉSOLUTION DES PERMISSIONS (avec cache DB)
// ───────────────────────────────────────────

/**
 * Récupère la config DB d'un rôle, ou fallback sur les defaults.
 * Utilise React cache() pour éviter les requêtes dupliquées
 * dans le même render cycle Server Component.
 */
export const getRoleConfig = cache(async (role: Role) => {
  try {
    const dbConfig = await prisma.roleConfig.findUnique({
      where: { role, isActive: true },
    });

    if (!dbConfig) {
      return DEFAULT_ROLE_CONFIG[role];
    }

    // Merge DB config avec defaults (DB prime sur defaults)
    const defaultConfig = DEFAULT_ROLE_CONFIG[role];
    return {
      level: defaultConfig.level,
      permissions: {
        ...defaultConfig.permissions,
        ...(dbConfig.permissions as Record<Permission, ToggleState>),
      },
      restrictions: {
        ...defaultConfig.restrictions,
        ...(dbConfig.restrictions as Record<Restriction, string | ToggleState>),
      },
    };
  } catch {
    // Fallback silencieux sur defaults si DB indisponible
    return DEFAULT_ROLE_CONFIG[role];
  }
});

/**
 * Résout les permissions EFFECTIVES d'un rôle en incluant
 * l'héritage hiérarchique. Un Level N hérite de tous les ON des levels > N.
 */
export async function resolveEffectivePermissions(
  role: Role,
): Promise<Set<Permission>> {
  const userLevel = getRoleLevel(role);
  const effectivePerms = new Set<Permission>();

  // Parcours tous les niveaux du rôle actuel jusqu'au Level 6
  for (let level = userLevel; level <= LEVELS.LEVEL_6; level++) {
    const levelRole = LEVEL_TO_ROLE[level];
    const config = await getRoleConfig(levelRole);

    for (const [perm, state] of Object.entries(config.permissions)) {
      if (state === "ON") {
        effectivePerms.add(perm as Permission);
      }
    }
  }

  return effectivePerms;
}

/**
 * Résout les restrictions EFFECTIVES (la plus restrictive prime).
 */
export async function resolveEffectiveRestrictions(
  role: Role,
): Promise<Map<Restriction, string | ToggleState>> {
  const userLevel = getRoleLevel(role);
  const effectiveRestr = new Map<Restriction, string | ToggleState>();

  // Du Level 6 (plus restrictif) au Level du rôle (moins restrictif)
  for (let level = LEVELS.LEVEL_6; level >= userLevel; level--) {
    const levelRole = LEVEL_TO_ROLE[level];
    const config = await getRoleConfig(levelRole);

    for (const [restr, value] of Object.entries(config.restrictions)) {
      // La valeur du niveau le plus restrictif (le plus bas) prime
      if (!effectiveRestr.has(restr as Restriction)) {
        effectiveRestr.set(restr as Restriction, value);
      }
    }
  }

  return effectiveRestr;
}

// ───────────────────────────────────────────
// 7. API PUBLIQUE — VÉRIFICATIONS
// ───────────────────────────────────────────

/**
 * Vérifie si un rôle a une permission spécifique.
 * Prend en compte l'héritage hiérarchique.
 */
export async function hasPermission(
  role: Role,
  permission: Permission,
): Promise<boolean> {
  const effective = await resolveEffectivePermissions(role);
  return effective.has(permission);
}

/**
 * Vérifie si un rôle a TOUTES les permissions demandées.
 */
export async function hasAllPermissions(
  role: Role,
  permissions: Permission[],
): Promise<boolean> {
  const effective = await resolveEffectivePermissions(role);
  return permissions.every((p) => effective.has(p));
}

/**
 * Vérifie si un rôle a AU MOINS UNE des permissions demandées.
 */
export async function hasAnyPermission(
  role: Role,
  permissions: Permission[],
): Promise<boolean> {
  const effective = await resolveEffectivePermissions(role);
  return permissions.some((p) => effective.has(p));
}

/**
 * Récupère la valeur d'une restriction.
 */
export async function getRestrictionValue(
  role: Role,
  restriction: Restriction,
): Promise<string | ToggleState> {
  const restrictions = await resolveEffectiveRestrictions(role);
  return restrictions.get(restriction) ?? "OFF";
}

/**
 * Vérifie si une restriction est activée (ON).
 */
export async function isRestrictionEnabled(
  role: Role,
  restriction: Restriction,
): Promise<boolean> {
  const value = await getRestrictionValue(role, restriction);
  return value === "ON";
}

/**
 * Récupère une valeur numérique de restriction (pour les quotas).
 */
export async function getNumericRestriction(
  role: Role,
  restriction: Restriction,
): Promise<number> {
  const value = await getRestrictionValue(role, restriction);
  const num = parseInt(value as string, 10);
  return isNaN(num) ? 0 : num;
}

// ───────────────────────────────────────────
// 8. INTÉGRATION BETTER-AUTH (Server Session)
// ───────────────────────────────────────────

/**
 * Récupère le rôle de l'utilisateur depuis la session Better-Auth.
 * À utiliser dans Server Components, Server Actions, Route Handlers.
 */
export async function getCurrentUserRole(): Promise<Role> {
  // Better-Auth : récupère la session depuis les headers
  const headersList = await headers();
  const authInstance = auth({
    // ta config better-auth existante
  });

  const session = await authInstance.api.getSession({
    headers: headersList,
  });

  if (!session?.user) {
    return ROLES.USER; // Fallback to USER if no session or user
  }

  // Le rôle peut être directement sur user ou dans des métadonnées ; fallback to USER
  const roleStr =
    (session.user as any).role ??
    (session.user as any).metadata?.role ??
    ROLES.USER;

  return normalizeRole(roleStr as string);
}

/**
 * Récupère le rôle et les infos user en une seule requête.
 */
export async function getCurrentUserWithRole() {
  const headersList = await headers();
  const authInstance = auth({
    // ta config
  });

  const session = await authInstance.api.getSession({
    headers: headersList,
  });

  if (!session?.user) {
    return null; // Return null if no session or user
  }

  const roleStr =
    (session.user as any).role ??
    (session.user as any).metadata?.role ??
    ROLES.USER;
  const role = normalizeRole(roleStr as string);

  return {
    user: session.user,
    role,
    level: getRoleLevel(role),
    isAuthenticated: true,
  };
}

// ───────────────────────────────────────────
// 9. GUARDS & REDIRECTS (Server Components)
// ───────────────────────────────────────────

/**
 * Guard pour Server Component : redirige si pas la permission.
 */
export async function requirePermission(
  permission: Permission,
  redirectTo: string = "/unauthorized",
): Promise<Role> {
  const role = await getCurrentUserRole();

  if (!(await hasPermission(role, permission))) {
    redirect(redirectTo);
  }

  return role;
}

/**
 * Guard pour Server Component : redirige si pas TOUTES les permissions.
 */
export async function requireAllPermissions(
  permissions: Permission[],
  redirectTo: string = "/unauthorized",
): Promise<Role> {
  const role = await getCurrentUserRole();

  if (!(await hasAllPermissions(role, permissions))) {
    redirect(redirectTo);
  }

  return role;
}

/**
 * Guard pour Server Component : redirige si niveau trop bas.
 */
export async function requireMinLevel( // Ajout de currentRole comme paramètre optionnel
  minLevel: number,
  redirectTo: string = "/unauthorized",
  currentRole?: Role,
): Promise<Role> {
  // Utilise le rôle fourni ou le récupère si non spécifié
  const role = currentRole || (await getCurrentUserRole());

  const actualLevel = getRoleLevel(role);

  if (actualLevel > minLevel) {
    redirect(redirectTo);
  }

  return role;
}

/**
 * Guard pour Server Component : redirige si non authentifié.
 */
export async function requireAuth(
  redirectTo: string = "/login",
): Promise<Role> {
  const userData = await getCurrentUserWithRole();

  if (!userData?.isAuthenticated) {
    redirect(redirectTo);
  }

  return userData.role;
}

// ───────────────────────────────────────────
// 10. HELPERS POUR SERVER ACTIONS
// ───────────────────────────────────────────

/**
 * Wrapper pour Server Actions : vérifie la permission avant exécution.
 */
export async function withPermission<T>(
  permission: Permission,
  action: (role: Role) => Promise<T>,
): Promise<T> {
  const role = await getCurrentUserRole();

  if (!(await hasPermission(role, permission))) {
    throw new Error(`Forbidden: requires permission '${permission}'`);
  }

  return action(role);
}

/**
 * Wrapper pour Server Actions : vérifie le niveau minimum.
 */
export async function withMinLevel<T>(
  minLevel: number,
  action: (role: Role) => Promise<T>,
): Promise<T> {
  const role = await getCurrentUserRole();

  if (getRoleLevel(role) > minLevel) {
    throw new Error(
      `Forbidden: requires level ${minLevel} or higher (current: ${getRoleLevel(
        role,
      )})`,
    );
  }

  return action(role);
}

// ───────────────────────────────────────────
// 11. EXPORTS POUR CLIENT (uniquement données sérialisables)
// ───────────────────────────────────────────

/**
 * Retourne la liste des permissions d'un rôle pour le client.
 * À appeler dans un Server Component et passer en props.
 */
export async function getClientPermissions(role: Role): Promise<Permission[]> {
  const effective = await resolveEffectivePermissions(role);
  return Array.from(effective);
}

/**
 * Retourne les restrictions d'un rôle pour le client.
 */
export async function getClientRestrictions(
  role: Role,
): Promise<Record<Restriction, string | ToggleState>> {
  const restrictions = await resolveEffectiveRestrictions(role);
  return Object.fromEntries(restrictions) as Record<
    Restriction,
    string | ToggleState
  >;
}

// ============================================
// AJOUTS à placer à la suite de ton fichier existant
// ============================================

/**
 * Vérifie si le rôle est ADMIN ou SUPER_ADMIN (Level 1 ou 2).
 * Strict : seuls ces deux rôles peuvent effectuer des bulk delete.
 */
export function isAdminOrSuperAdmin(role: Role): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

/**
 * Guard : throw si l'utilisateur courant n'est pas Admin/SuperAdmin.
 * À utiliser dans Server Actions et Route Handlers.
 */
export async function requireAdminOrSuperAdmin(
  redirectTo: string = "/unauthorized",
): Promise<{ userId: string; role: Role }> {
  const userData = await getCurrentUserWithRole();

  if (!userData?.isAuthenticated || !isAdminOrSuperAdmin(userData.role)) {
    redirect(redirectTo);
  }

  return {
    userId: userData.user.id,
    role: userData.role,
  };
}

/**
 * Récupère la session Better-Auth brute + user complet.
 * Utile pour obtenir l'userId pour les requêtes Prisma (audit).
 */
export async function getSessionWithUser() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) return null;

  return {
    session,
    user: session.user,
    userId: session.user.id,
    role: normalizeRole(
      ((session.user as any).role ??
        (session.user as any).metadata?.role) as string,
    ),
  };
}
