// lib/security/resource-access.ts
// ============================================
// RESOURCE ACCESS — Contrôle fin d'accès à une ressource
// ============================================
// Ce fichier valide l'accès à une ressource (assertResourceAccess) dans les
// Server Actions / Server Components, avec une logique d'ÉCHEC FERMÉ
// (fail-closed) :
//   - toute configuration invalide ou contexte malformé REFUSE l'accès ;
//   - tout refus d'accès est tracé via logAudit (fire-and-forget) ;
//   - l'audit ne peut jamais masquer (ni provoquer) le refus lui-même.
//
// Conventions alignées sur lib/auth/server.ts et lib/auth/rbac.ts :
//   - Niveau 1 (SUPER_ADMIN, plus permissif) ... 7 (GUEST, moins permissif) :
//     un niveau minimum est satisfait si context.user.level <= minRoleLevel ;
//   - Une restriction est "activée" si sa valeur vaut "ON", un booléen legacy
//     true, ou un nombre strictement positif (quotas : "100", "12", ...) ;
//   - Les codes de permission legacy (alias) sont résolus vers le code
//     canonique via le catalogue PERMISSIONS / tryResolvePermissionCode
//     (fail-closed si le code est inconnu).

import {
  type AuthContext,
  AuthorizationError,
  logAudit,
} from "@/lib/auth/server";

import {
  PERMISSIONS,
  RESTRICTIONS,
  ROLES,
  type Permission,
  type Restriction,
  type Role,
  type ToggleState,
  tryResolvePermissionCode,
} from "@/lib/auth/rbac";

/** Bornes de la convention de niveaux (1 = SUPER_ADMIN ... 7 = GUEST). */
const MIN_ROLE_LEVEL = 1;
const MAX_ROLE_LEVEL = 7;

function normalizePermission(value: Permission | string | null | undefined): Permission | null {
  if (value == null) return null;

  if (typeof value === "string") {
    const resolved = tryResolvePermissionCode(value);
    return resolved ?? null;
  }

  return value;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRestrictionEnabledValue(
  value: string | ToggleState | boolean | number | null | undefined,
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (normalized.length === 0) {
      return false;
    }

    const upper = normalized.toUpperCase();
    if (upper === "ON" || upper === "TRUE" || upper === "YES" || upper === "1") {
      return true;
    }

    const numeric = Number(normalized);
    if (Number.isFinite(numeric)) {
      return numeric > 0;
    }

    return false;
  }

  return false;
}

function serializeAuditDetail(details: unknown): string {
  if (typeof details === "string") {
    return details;
  }

  if (details == null) {
    return "";
  }

  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

export type ResourceAccessCheck = {
  action: string;
  resource: string;
  resourceId?: string;

  // Règles par ressource (issus des configs Prisma)
  /** Code de permission obligatoire (catalogue PERMISSIONS ou alias legacy). */
  requiredPermission?: Permission | string | null;
  /** Satisfait si context.user.level <= minRoleLevel (1 = plus permissif ... 7 = moins). */
  minRoleLevel?: number | null;

  // Restrictions (ex: restricted_to_own_data)
  /** Clé du catalogue RESTRICTIONS devant être activée sur le contexte. */
  restriction?: Restriction | string | null;

  // Ownership optionnel (si tu veux imposer un filtre userId)
  ownership?: {
    /**
     * Si l'objet `ownership` est fourni, un identifiant NON VIDE est exigé :
     * il doit être égal à context.user.id, sinon l'accès est refusé.
     * Un ownership sans identifiant exploitable est refusé (fail-closed).
     */
    ownershipUserId?: string | null;
  };

  // Options
  /** Si renseigné, un SUCCESS est aussi journalisé dans l'audit. */
  auditDetails?: unknown;
};

function validateContextShape(context: AuthContext | null | undefined): string[] {
  const issues: string[] = [];

  if (!context || !context.user) {
    return ["Contexte d'authentification absent ou invalide."];
  }

  if (!isNonEmptyString(context.user.id)) {
    issues.push("context.user.id manquant ou vide.");
  }

  if (!isNonEmptyString(context.user.role)) {
    issues.push("context.user.role manquant ou invalide.");
  }

  if (typeof context.user.level !== "number" || !Number.isInteger(context.user.level)) {
    issues.push("context.user.level invalide.");
  } else if (context.user.level < MIN_ROLE_LEVEL || context.user.level > MAX_ROLE_LEVEL) {
    issues.push(`context.user.level hors bornes (${MIN_ROLE_LEVEL}-${MAX_ROLE_LEVEL}).`);
  }

  if (!(context.permissions instanceof Set)) {
    issues.push("context.permissions n'est pas un Set valide.");
  }

  if (!(context.restrictions instanceof Map)) {
    issues.push("context.restrictions n'est pas une Map valide.");
  }

  return issues;
}

export function canAccessResource(
  context: AuthContext | null | undefined,
  check: ResourceAccessCheck,
): boolean {
  try {
    assertResourceAccess(context, check);
    return true;
  } catch {
    return false;
  }
}

export function assertResourceAccess(
  context: AuthContext | null | undefined,
  check: ResourceAccessCheck,
): asserts context is AuthContext {
  const contextualIssues = validateContextShape(context);
  const issues: string[] = [...contextualIssues];

  if (!check || typeof check !== "object") {
    throw new AuthorizationError("Configuration de contrôle d'accès invalide.", "INVALID_RESOURCE_ACCESS_CHECK", 400);
  }

  if (!isNonEmptyString(check.action)) {
    issues.push("action manquante ou vide.");
  }

  if (!isNonEmptyString(check.resource)) {
    issues.push("resource manquante ou vide.");
  }

  if (check.minRoleLevel != null) {
    const numericMinRoleLevel = Number(check.minRoleLevel);
    if (!Number.isInteger(numericMinRoleLevel) || numericMinRoleLevel < MIN_ROLE_LEVEL || numericMinRoleLevel > MAX_ROLE_LEVEL) {
      issues.push(`minRoleLevel invalide (${String(check.minRoleLevel)}).`);
    } else if (context && context.user.level > numericMinRoleLevel) {
      issues.push(`Niveau de rôle insuffisant: ${context.user.level} > ${numericMinRoleLevel}.`);
    }
  }

  if (check.requiredPermission != null) {
    const required = normalizePermission(check.requiredPermission);
    if (!required) {
      issues.push(`Permission inconnue ou invalide: ${String(check.requiredPermission)}.`);
    } else if (context && !context.permissions.has(required)) {
      issues.push(`Permission manquante: ${required}.`);
    }
  }

  if (check.restriction != null) {
    const restrictionKey = check.restriction as Restriction;
    if (!Object.values(RESTRICTIONS).includes(restrictionKey)) {
      issues.push(`Restriction inconnue: ${String(check.restriction)}.`);
    } else if (context) {
      const restrictionValue = context.restrictions.get(restrictionKey);
      if (!isRestrictionEnabledValue(restrictionValue)) {
        issues.push(`Restriction non activée: ${restrictionKey}.`);
      }
    }
  }

  if (check.ownership) {
    const ownershipUserId = check.ownership.ownershipUserId;
    if (!isNonEmptyString(ownershipUserId)) {
      issues.push("ownershipUserId absent ou vide.");
    } else if (context && ownershipUserId !== context.user.id) {
      issues.push(`Ownership refusé: ${ownershipUserId} != ${context.user.id}.`);
    }
  }

  if (issues.length > 0) {
    const reason = issues.join("; ");
    const action = (check?.action ?? "resource_access").toString();
    const resource = (check?.resource ?? "unknown").toString();

    void logAudit({
      userId: context?.user?.id ?? "unknown",
      role: (context?.user?.role as Role) ?? ROLES.GUEST,
      roleLevel: context?.user?.level ?? MAX_ROLE_LEVEL,
      action,
      resource,
      resourceId: check?.resourceId,
      success: false,
      details: `${reason}`,
    });

    throw new AuthorizationError(
      `Accès refusé pour ${action} sur ${resource}: ${reason}`,
      "RESOURCE_ACCESS_DENIED",
      403,
    );
  }

  if (check.auditDetails !== undefined && context) {
    const details = serializeAuditDetail(check.auditDetails);
    void logAudit({
      userId: context.user.id,
      role: context.user.role,
      roleLevel: context.user.level,
      action: check.action,
      resource: check.resource,
      resourceId: check.resourceId,
      success: true,
      details: details || "access granted",
    });
  }
}

/**
 * Vérifie si l'acteur authentifié a le droit d'accéder à la ressource d'un utilisateur cible (targetUserId).
 *
 * RÈGLE D'OR (Isolation des données & Prévention IDOR/BOLA) :
 * - Un utilisateur peut TOUJOURS consulter et gérer ses PROPRES données (targetUserId === context.user.id).
 * - Un utilisateur ne peut JAMAIS consulter ni gérer les données d'un autre utilisateur (targetUserId !== context.user.id),
 *   SAUF s'il détient une permission RBAC explicite ou un niveau de rôle d'administration (Level 1-2 ou Level <= minRoleLevel).
 */
export function canAccessUserData(
  context: AuthContext | null | undefined,
  targetUserId: string | null | undefined,
  requiredPermissions: Permission | Permission[] = [],
  options?: {
    minRoleLevel?: number;
    action?: string;
    resource?: string;
    resourceId?: string;
  },
): boolean {
  try {
    assertAccessUserData(context, targetUserId, requiredPermissions, options);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valide l'accès à une ressource utilisateur (ownership OU permission RBAC) en mode fail-closed.
 * Lève AuthorizationError si l'accès est refusé et consigne l'événement dans le journal d'audit.
 */
export function assertAccessUserData(
  context: AuthContext | null | undefined,
  targetUserId: string | null | undefined,
  requiredPermissions: Permission | Permission[] = [],
  options?: {
    minRoleLevel?: number;
    action?: string;
    resource?: string;
    resourceId?: string;
  },
): asserts context is AuthContext {
  const action = options?.action ?? "access_user_data";
  const resource = options?.resource ?? "user_data";
  const resourceId = options?.resourceId ?? targetUserId ?? undefined;

  if (!context || !context.user) {
    void logAudit({
      userId: "anonymous",
      role: ROLES.GUEST,
      roleLevel: MAX_ROLE_LEVEL,
      action,
      resource,
      resourceId,
      success: false,
      details: "Authentification requise pour accéder aux données utilisateur",
    });
    throw new AuthorizationError(
      "Authentification requise pour accéder à cette ressource.",
      "UNAUTHENTICATED",
      401,
    );
  }

  if (!isNonEmptyString(targetUserId)) {
    throw new AuthorizationError(
      "Identifiant utilisateur cible invalide ou manquant.",
      "INVALID_TARGET_USER",
      400,
    );
  }

  // 1. Accès direct si l'utilisateur est le propriétaire légitime
  if (context.user.id === targetUserId) {
    return;
  }

  // 2. Accès tiers conditionné par les permissions RBAC ou le niveau hiérarchique
  const permissionsList = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  const hasExplicitPermission = permissionsList.some((perm) => {
    const normalized = normalizePermission(perm);
    return normalized ? context.permissions.has(normalized) : false;
  });

  const minLevel = options?.minRoleLevel ?? 2; // Par défaut, Admin (Level 2) ou Super-Admin (Level 1)
  const hasSufficientLevel =
    typeof context.user.level === "number" && context.user.level <= minLevel;

  if (hasExplicitPermission || hasSufficientLevel) {
    return;
  }

  // 3. Violation d'accès détectée (tentative IDOR / BOLA) -> Fail-closed + Audit
  void logAudit({
    userId: context.user.id,
    role: (context.user.role as Role) ?? ROLES.GUEST,
    roleLevel: context.user.level ?? MAX_ROLE_LEVEL,
    action,
    resource,
    resourceId,
    success: false,
    details: `Tentative d'accès non autorisé aux données de l'utilisateur ${targetUserId} par ${context.user.id}`,
  });

  throw new AuthorizationError(
    "Accès refusé : vous n'êtes pas autorisé à consulter ou modifier les données d'un autre utilisateur.",
    "FORBIDDEN",
    403,
  );
}

export { PERMISSIONS, RESTRICTIONS, ROLES, type Permission, type Restriction, type Role, type ToggleState };

