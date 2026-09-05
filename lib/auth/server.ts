// lib/auth/server.ts
// ============================================
// SERVER AUTH FACADE — Couche d'abstraction RBAC unifiée
// ============================================
// Ce fichier est le POINT D'ENTRÉE UNIQUE pour toute logique d'authentification
// et d'autorisation côté serveur dans Boutiquecogi3.
//
// RESPONSABILITÉS :
//   1. Gestion atomique de la session (cache + singleton)
//   2. Guards hiérarchiques (Level 1-7) avec redirections
//   3. Vérification des permissions avec héritage
//   4. Vérification des restrictions (quotas, feature flags)
//   5. Audit et traçabilité (userId, timestamp, action)
//   6. Exposition d'APIs typées pour Server Components & Server Actions
//
// RÈGLES D'OR :
//   - JAMAIS importer betterAuth() directement — utiliser auth depuis '@/lib/auth'
//   - JAMAIS appeler auth.api.getSession() hors de ce fichier
//   - TOUJOURS passer par les guards pour les Server Components
//   - TOUJOURS utiliser les wrappers pour les Server Actions

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth"; // ✅ Singleton
import { getSessionTokenFromCookieHeader } from "@/lib/auth/session-cookie";
import { prisma } from "@/lib/prisma";
import { generateUUIDv7 } from "@/lib/utils/uuid";
import { getRedisClient } from "@/lib/redis";
import {
  getEffectivePermissionsCached,
  getEffectiveRestrictionsCached,
} from "@/lib/auth/rbac-cache";
import type { AuthenticatedUser } from "@/lib/auth/rbac-shared";
import {
  // Types
  type Role,
  type PermissionCode,
  type Restriction,
  type ToggleState,
  // Constants
  ROLES,
  LEVELS,
  PERMISSIONS,
  RESTRICTIONS,
  // Core functions
  normalizeRole,
  getRoleLevel,
  isRoleAboveOrEqual,
  canManageRole,
  resolveEffectivePermissions,
  resolveEffectiveRestrictions,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getRestrictionValue,
  isRestrictionEnabled,
  getNumericRestriction,
  isAdminOrSuperAdmin,
  // Session helpers
  getCurrentUserRole,
  getCurrentUserWithRole,
  getSessionWithUser,
  // Cache
  invalidateRBACCache,
  // Client helpers
  getClientPermissions,
  getClientRestrictions,
} from "@/lib/auth/rbac";

// ═══════════════════════════════════════════
// SECTION 1: TYPES EXPORTS
// ═══════════════════════════════════════════

/**
 * Contexte d'autorisation complet pour une requête.
 * Passé aux Server Actions et aux composants enfants.
 */
export interface AuthContext {
  user: AuthenticatedUser;
  permissions: Set<PermissionCode>;
  restrictions: Map<Restriction, string | ToggleState>;
  isAuthenticated: true;
  timestamp: number;
}

/**
 * Résultat d'une vérification de quota.
 */
export interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  restriction: Restriction;
}

/**
 * Entrée d'audit pour traçabilité.
 */
export interface AuditEntry {
  userId: string;
  role: Role;
  /** Derived from role if not explicitly provided */
  roleLevel?: number;
  action: string;
  resource: string;
  resourceId?: string;
  success: boolean;
  details?: string;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
}

// ═══════════════════════════════════════════
// SECTION 2: CACHE DE SESSION (React cache + Redis)
// ═══════════════════════════════════════════

const SESSION_CACHE_TTL_SECONDS = 30;

/**
 * Cache React + Redis pour dédupliquer et accélérer la résolution de session.
 */
const _cachedGetSession = cache(async () => {
  const headersList = await headers();
  const cookieHeader = headersList.get("cookie");
  let cacheKey: string | null = null;

  if (cookieHeader) {
    const sessionToken = getSessionTokenFromCookieHeader(cookieHeader);
    if (sessionToken) {
      cacheKey = `session:raw:${sessionToken}`;
      try {
        const redis = getRedisClient();
        // Ne sollicite Redis que si le circuit breaker autorise —
        // évite le bruit d'erreurs quand Redis est indisponible ou
        // mal configuré (ex: NOAUTH sans REDIS_PASSWORD).
        if (redis.isHealthy()) {
          const cached = await redis.get<
            Awaited<ReturnType<typeof auth.api.getSession>>
          >(cacheKey);
          if (cached !== null) {
            return cached;
          }
        }
      } catch {
        // Fallback non-bloquant en cas d'erreur Redis
      }
    }
  }

  const session = await auth.api.getSession({ headers: headersList });

  if (cacheKey && session) {
    try {
      const redis = getRedisClient();
      if (redis.isHealthy()) {
        await redis.setex(cacheKey, SESSION_CACHE_TTL_SECONDS, session);
      }
    } catch {
      // Fallback non-bloquant en cas d'erreur Redis
    }
  }

  return session;
});

export async function getCachedSession() {
  return _cachedGetSession();
}

// ═══════════════════════════════════════════
// SECTION 3: RÉSOLUTION COMPLÈTE DU CONTEXT
// ═══════════════════════════════════════════

/**
 * Résout le contexte d'autorisation COMPLET en une seule passe.
 * Charge session + permissions (Redis) + restrictions (Redis) en parallèle.
 *
 * Usage : Server Components qui ont besoin de tout le contexte RBAC.
 */
export async function resolveAuthContext(): Promise<AuthContext | null> {
  const session = await getCachedSession();

  if (!session?.user) {
    return null;
  }

  const rawRole =
    (session.user as Record<string, unknown>).role ??
    (
      (session.user as Record<string, unknown>).metadata as Record<
        string,
        unknown
      >
    )?.role;

  const role = normalizeRole(rawRole as string);
  const level = getRoleLevel(role);

  // Chargement parallèle des permissions et restrictions optimisé par cache Redis
  const [permissions, restrictions] = await Promise.all([
    getEffectivePermissionsCached(role, () =>
      resolveEffectivePermissions(role),
    ),
    getEffectiveRestrictionsCached(role, () =>
      resolveEffectiveRestrictions(role),
    ),
  ]);

  const user: AuthenticatedUser = {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    role,
    level,
    image: (session.user as Record<string, unknown>).image as
      | string
      | null
      | undefined,
    emailVerified:
      ((session.user as Record<string, unknown>).emailVerified as boolean) ??
      false,
    createdAt: new Date(
      (session.user as Record<string, unknown>).createdAt as string,
    ),
    updatedAt: new Date(
      (session.user as Record<string, unknown>).updatedAt as string,
    ),
  };

  return {
    user,
    permissions,
    restrictions,
    isAuthenticated: true,
    timestamp: Date.now(),
  };
}

/**
 * Version synchrone du contexte (pour les cas où on a déjà le contexte).
 * À utiliser quand resolveAuthContext() a déjà été appelé en amont.
 */
export function createAuthContextFromRole(
  role: Role,
  userData: Partial<AuthenticatedUser>,
): Promise<AuthContext> {
  // Cette fonction est async car resolveEffectivePermissions l'est
  return (async () => {
    const [permissions, restrictions] = await Promise.all([
      resolveEffectivePermissions(role),
      resolveEffectiveRestrictions(role),
    ]);

    return {
      user: {
        id: userData.id ?? "",
        email: userData.email ?? "",
        name: userData.name ?? null,
        role,
        level: getRoleLevel(role),
        image: userData.image,
        emailVerified: userData.emailVerified ?? false,
        createdAt: userData.createdAt ?? new Date(),
        updatedAt: userData.updatedAt ?? new Date(),
      },
      permissions,
      restrictions,
      isAuthenticated: true,
      timestamp: Date.now(),
    };
  })();
}

// ═══════════════════════════════════════════
// SECTION 4: GUARDS SERVER COMPONENTS (redirect)
// ═══════════════════════════════════════════

/**
 * Guard : exige une authentification valide.
 * Redirige vers /auth/sign-in si non authentifié.
 *
 * @returns AuthContext complet
 */
export async function guardAuth(
  redirectTo: string = "/auth/sign-in",
): Promise<AuthContext> {
  const context = await resolveAuthContext();

  if (!context) {
    redirect(redirectTo);
  }

  return context;
}

/**
 * Guard : exige une permission spécifique.
 * Redirige vers /unauthorized si refusé.
 *
 * @returns AuthContext filtré (la permission est garantie)
 */
export async function guardPermission(
  permission: PermissionCode,
  redirectTo: string = "/unauthorized",
): Promise<AuthContext> {
  const context = await guardAuth();

  if (!context.permissions.has(permission)) {
    redirect(redirectTo);
  }

  return context;
}

/**
 * Guard : exige TOUTES les permissions listées.
 */
export async function guardAllPermissions(
  permissions: PermissionCode[],
  redirectTo: string = "/unauthorized",
): Promise<AuthContext> {
  const context = await guardAuth();

  const hasAll = permissions.every((p) => context.permissions.has(p));
  if (!hasAll) {
    redirect(redirectTo);
  }

  return context;
}

/**
 * Guard : exige AU MOINS UNE des permissions listées.
 */
export async function guardAnyPermission(
  permissions: PermissionCode[],
  redirectTo: string = "/unauthorized",
): Promise<AuthContext> {
  const context = await guardAuth();

  const hasAny = permissions.some((p) => context.permissions.has(p));
  if (!hasAny) {
    redirect(redirectTo);
  }

  return context;
}

/**
 * Guard : exige un niveau hiérarchique minimum.
 * Level 1 = SUPER_ADMIN (plus permissif), Level 7 = GUEST (moins permissif).
 */
export async function guardMinLevel(
  minLevel: number,
  redirectTo: string = "/unauthorized",
): Promise<AuthContext> {
  const context = await guardAuth();

  if (context.user.level > minLevel) {
    redirect(redirectTo);
  }

  return context;
}

/**
 * Guard : exige un niveau hiérarchique maximum (rare, pour les zones réservées aux juniors).
 */
export async function guardMaxLevel(
  maxLevel: number,
  redirectTo: string = "/unauthorized",
): Promise<AuthContext> {
  const context = await guardAuth();

  if (context.user.level < maxLevel) {
    redirect(redirectTo);
  }

  return context;
}

/**
 * Guard : exige ADMIN ou SUPER_ADMIN.
 * C'est le guard le plus strict pour les opérations critiques.
 */
export async function guardAdmin(
  redirectTo: string = "/unauthorized",
): Promise<AuthContext> {
  const context = await guardAuth();

  if (!isAdminOrSuperAdmin(context.user.role)) {
    redirect(redirectTo);
  }

  return context;
}

/**
 * Guard : exige SUPER_ADMIN uniquement.
 */
export async function guardSuperAdmin(
  redirectTo: string = "/unauthorized",
): Promise<AuthContext> {
  const context = await guardAuth();

  if (context.user.role !== ROLES.SUPER_ADMIN) {
    redirect(redirectTo);
  }

  return context;
}

/**
 * Guard : vérifie qu'un utilisateur peut gérer un autre rôle.
 * Utilisé dans les pages de gestion des utilisateurs.
 */
export async function guardCanManageRole(
  targetRole: Role,
  redirectTo: string = "/unauthorized",
): Promise<AuthContext> {
  const context = await guardAuth();

  if (!canManageRole(context.user.role, targetRole)) {
    redirect(redirectTo);
  }

  return context;
}

// ═══════════════════════════════════════════
// SECTION 5: GUARDS SERVER ACTIONS (throw)
// ═══════════════════════════════════════════

/**
 * Erreur standardisée pour les refus d'autorisation en Server Action.
 */
export class AuthorizationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(
    message: string,
    code: string = "FORBIDDEN",
    statusCode: number = 403,
  ) {
    super(message);
    this.name = "AuthorizationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Wrapper Server Action : exige authentification.
 * Jette AuthorizationError si non authentifié.
 */
export async function actionRequireAuth<T>(
  action: (context: AuthContext) => Promise<T>,
): Promise<T> {
  const context = await resolveAuthContext();

  if (!context) {
    throw new AuthorizationError(
      "Authentification requise.",
      "UNAUTHENTICATED",
      401,
    );
  }

  return action(context);
}

/**
 * Wrapper Server Action : exige une permission.
 */
export async function actionRequirePermission<T>(
  permission: PermissionCode,
  action: (context: AuthContext) => Promise<T>,
): Promise<T> {
  return actionRequireAuth(async (context) => {
    if (!context.permissions.has(permission)) {
      throw new AuthorizationError(
        `Permission '${permission}' requise.`,
        "MISSING_PERMISSION",
        403,
      );
    }
    return action(context);
  });
}

/**
 * Wrapper Server Action : exige TOUTES les permissions.
 */
export async function actionRequireAllPermissions<T>(
  permissions: PermissionCode[],
  action: (context: AuthContext) => Promise<T>,
): Promise<T> {
  return actionRequireAuth(async (context) => {
    const missing = permissions.filter((p) => !context.permissions.has(p));
    if (missing.length > 0) {
      throw new AuthorizationError(
        `Permissions manquantes: ${missing.join(", ")}`,
        "MISSING_PERMISSIONS",
        403,
      );
    }
    return action(context);
  });
}

/**
 * Wrapper Server Action : exige AU MOINS UNE permission.
 */
export async function actionRequireAnyPermission<T>(
  permissions: PermissionCode[],
  action: (context: AuthContext) => Promise<T>,
): Promise<T> {
  return actionRequireAuth(async (context) => {
    const hasAny = permissions.some((p) => context.permissions.has(p));
    if (!hasAny) {
      throw new AuthorizationError(
        `Au moins une des permissions suivantes est requise: ${permissions.join(", ")}`,
        "MISSING_PERMISSION",
        403,
      );
    }
    return action(context);
  });
}

/**
 * Wrapper Server Action : exige niveau minimum.
 */
export async function actionRequireMinLevel<T>(
  minLevel: number,
  action: (context: AuthContext) => Promise<T>,
): Promise<T> {
  return actionRequireAuth(async (context) => {
    if (context.user.level > minLevel) {
      throw new AuthorizationError(
        `Niveau ${minLevel} ou supérieur requis (actuel: ${context.user.level}).`,
        "INSUFFICIENT_LEVEL",
        403,
      );
    }
    return action(context);
  });
}

/**
 * Wrapper Server Action : exige ADMIN ou SUPER_ADMIN.
 */
export async function actionRequireAdmin<T>(
  action: (context: AuthContext) => Promise<T>,
): Promise<T> {
  return actionRequireAuth(async (context) => {
    if (!isAdminOrSuperAdmin(context.user.role)) {
      throw new AuthorizationError(
        "Opération réservée aux administrateurs.",
        "ADMIN_REQUIRED",
        403,
      );
    }
    return action(context);
  });
}

/**
 * Wrapper Server Action : exige SUPER_ADMIN uniquement.
 */
export async function actionRequireSuperAdmin<T>(
  action: (context: AuthContext) => Promise<T>,
): Promise<T> {
  return actionRequireAuth(async (context) => {
    if (context.user.role !== ROLES.SUPER_ADMIN) {
      throw new AuthorizationError(
        "Opération réservée au SUPER_ADMIN.",
        "SUPER_ADMIN_REQUIRED",
        403,
      );
    }
    return action(context);
  });
}

// ═══════════════════════════════════════════
// SECTION 6: VÉRIFICATION DES RESTRICTIONS
// ═══════════════════════════════════════════

/**
 * Vérifie un quota numérique (ex: max_products_per_user).
 * Retourne un résultat détaillé avec remaining.
 */
export async function checkQuota(
  role: Role,
  restriction: Restriction,
  currentValue: number,
): Promise<QuotaCheckResult> {
  const limit = await getNumericRestriction(role, restriction);

  return {
    allowed: currentValue < limit,
    current: currentValue,
    limit,
    remaining: Math.max(0, limit - currentValue),
    restriction,
  };
}

/**
 * Vérifie un quota depuis le contexte (usage dans Server Action).
 * Jette AuthorizationError si le quota est dépassé.
 */
export async function enforceQuota(
  context: AuthContext,
  restriction: Restriction,
  currentValue: number,
): Promise<QuotaCheckResult> {
  const result = await checkQuota(context.user.role, restriction, currentValue);

  if (!result.allowed) {
    throw new AuthorizationError(
      `Quota dépassé: ${restriction} (limite: ${result.limit}, actuel: ${result.current}).`,
      "QUOTA_EXCEEDED",
      429,
    );
  }

  return result;
}

/**
 * Vérifie si une feature flag est activée pour le rôle.
 */
export async function checkFeatureFlag(
  role: Role,
  restriction: Restriction,
): Promise<boolean> {
  return isRestrictionEnabled(role, restriction);
}

/**
 * Vérifie si l'utilisateur est restreint à ses propres données.
 */
export async function isRestrictedToOwnData(role: Role): Promise<boolean> {
  return isRestrictionEnabled(role, RESTRICTIONS.RESTRICTED_TO_OWN_DATA);
}

/**
 * Vérifie si l'approbation est requise pour les suppressions.
 */
export async function isApprovalRequiredForDelete(
  role: Role,
): Promise<boolean> {
  return isRestrictionEnabled(role, RESTRICTIONS.REQUIRE_APPROVAL_FOR_DELETE);
}

// ═══════════════════════════════════════════
// SECTION 7: AUDIT & TRAÇABILITÉ
// ═══════════════════════════════════════════

/**
 * Enregistre une entrée d'audit en base de données.
 * Ne bloque jamais le flux principal (fire-and-forget).
 */
export async function logAudit(
  entry: Omit<AuditEntry, "timestamp">,
): Promise<void> {
  const headersList = await headers();

  const fullEntry: AuditEntry = {
    ...entry,
    timestamp: new Date(),
    ip:
      headersList.get("x-forwarded-for") ??
      headersList.get("x-real-ip") ??
      undefined,
    userAgent: headersList.get("user-agent") ?? undefined,
  };

  // Fire-and-forget : ne bloque pas le flux principal
  prisma.auditLog
    .create({
      data: {
        id: generateUUIDv7(),
        userId: fullEntry.userId,
        action: fullEntry.action,
        entity: fullEntry.resource,
        entityId: fullEntry.resourceId,
        ip: fullEntry.ip,
        userAgent: fullEntry.userAgent,
        roleLevel: fullEntry.roleLevel ?? getRoleLevel(fullEntry.role),
        status: fullEntry.success ? "SUCCESS" : "FAILURE",
        metadata: {
          role: fullEntry.role,
          details: fullEntry.details,
          success: fullEntry.success,
        },
      },
    })
    .catch((err) => {
      console.error("[AUDIT_LOG_ERROR]", err);
    });
}

/**
 * Wrapper audité pour les Server Actions critiques.
 * Log automatiquement le succès ou l'échec.
 */
export async function withAudit<T>(
  action: string,
  resource: string,
  fn: (context: AuthContext) => Promise<T>,
  resourceId?: string,
): Promise<T> {
  return actionRequireAuth(async (context) => {
    try {
      const result = await fn(context);

      logAudit({
        userId: context.user.id,
        role: context.user.role,
        action,
        resource,
        resourceId,
        success: true,
      });

      return result;
    } catch (error) {
      logAudit({
        userId: context.user.id,
        role: context.user.role,
        action,
        resource,
        resourceId,
        success: false,
        details: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  });
}

// ═══════════════════════════════════════════
// SECTION 8: HELPERS DE FILTRAGE (own data)
// ═══════════════════════════════════════════

/**
 * Construit une clause WHERE Prisma pour restreindre aux données de l'utilisateur.
 * Si le rôle n'a pas RESTRICTED_TO_OWN_DATA, retourne {} (pas de filtre).
 */
export async function buildOwnDataFilter(
  role: Role,
  userId: string,
): Promise<{ userId?: string }> {
  const restricted = await isRestrictedToOwnData(role);
  return restricted ? { userId } : {};
}

/**
 * Version synchrone (si on a déjà le contexte).
 */
export function buildOwnDataFilterSync(context: AuthContext): {
  userId?: string;
} {
  const restricted =
    context.restrictions.get(RESTRICTIONS.RESTRICTED_TO_OWN_DATA) === "ON";
  return restricted ? { userId: context.user.id } : {};
}

// ═══════════════════════════════════════════
// SECTION 9: COMPATIBILITÉ (deprecated)
// ═══════════════════════════════════════════

/**
 * @deprecated Utilisez guardAuth() à la place.
 * Maintenu pour compatibilité avec l'ancien code.
 */
export async function requireAuth(
  redirectTo: string = "/auth/sign-in",
): Promise<AuthenticatedUser> {
  const context = await guardAuth(redirectTo);
  return context.user;
}

/**
 * @deprecated Utilisez guardPermission() à la place.
 */
export async function requirePermission(
  permission: PermissionCode,
  redirectTo: string = "/unauthorized",
): Promise<AuthenticatedUser> {
  const context = await guardPermission(permission, redirectTo);
  return context.user;
}

/**
 * @deprecated Utilisez resolveAuthContext() à la place.
 */
export async function getServerSession() {
  return getCachedSession();
}

const ROLE_DETAILS: Record<string, { name: string; color: string }> = {
  SUPER_ADMIN: { name: "Super-Admin", color: "#ef4444" },
  ADMIN: { name: "Admin", color: "#f97316" },
  MANAGER: { name: "Manager", color: "#3b82f6" },
  EDITOR: { name: "Editor", color: "#10b981" },
  SUPERVISOR: { name: "Supervisor", color: "#8b5cf6" },
  USER: { name: "User", color: "#6b7280" },
  GUEST: { name: "Guest", color: "#9ca3af" },
};

/**
 * Récupère la session enrichie avec les rôles, niveaux et permissions (compatibilité RBAC).
 */
export async function getServerRBACSession() {
  const context = await resolveAuthContext();
  if (!context) return null;

  const { role, level, id } = context.user;
  const roleInfo = ROLE_DETAILS[role] || { name: role, color: "#6b7280" };

  return {
    level,
    userId: id,
    role: roleInfo,
    effectivePermissions: context.permissions,
  };
}

// ═══════════════════════════════════════════
// SECTION 10: EXPORTS NOMMÉS (réexportation)
// ═══════════════════════════════════════════

// Réexporte tout le moteur RBAC pour un import unique
export {
  ROLES,
  LEVELS,
  PERMISSIONS,
  RESTRICTIONS,
  normalizeRole,
  getRoleLevel,
  isRoleAboveOrEqual,
  canManageRole,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getRestrictionValue,
  isRestrictionEnabled,
  getNumericRestriction,
  isAdminOrSuperAdmin,
  getCurrentUserRole,
  getCurrentUserWithRole,
  getSessionWithUser,
  getClientPermissions,
  getClientRestrictions,
  invalidateRBACCache,
};

export type { Role, PermissionCode, Restriction, ToggleState };
