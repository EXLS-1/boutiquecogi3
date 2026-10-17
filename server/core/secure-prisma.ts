// server/core/secure-prisma.ts
// ============================================
// PORTE DE SÉCURITÉ INFAILLIBLE — SEUL ACCÈS À PRISMA
// ============================================
// Cette fonction est le SEUL moyen d'accéder à Prisma depuis les Server Actions.
// Il est IMPOSSIBLE d'appeler Prisma directement sans passer par ici.

import { AuditSeverity, PrismaClient } from '@prisma/client'
import { headers } from 'next/headers'
import { getAuditActorId, recordAuditLog } from '@/server/services/audit.service'
import {
  getRoleLevelByUserId,
  hasAllPermissionsOnResult,
  hasAnyPermissionOnResult,
  type RoleEvaluationResult,
  type PermissionCode,
  isDangerousPermission,
} from '@/lib/auth/rbac'

// ─── Instance Prisma singleton ───
import { prisma } from '@/lib/prisma'
export { prisma } from '@/lib/prisma'

// ─── Types ───

export type SecureContext = {
  userId: string
  roleLevel: number
  roleName: string
  roleData: RoleEvaluationResult
  prisma: PrismaClient
}

export class AuthorizationError extends Error {
  constructor(message: string, public code: string = 'FORBIDDEN') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

// ─── Construction du contexte sécurisé (INFAILLIBLE) ───

async function buildSecureContext(): Promise<SecureContext> {
  const headersList = await headers()

  // BetterAuth : récupère la session
  const { auth } = await import('@/lib/auth')
  const session = await auth.api.getSession({ headers: headersList })

  if (!session?.user?.id) {
    throw new AuthorizationError('Authentification requise', 'UNAUTHENTICATED')
  }

  // Évalue le rôle — CETTE ÉTAPE EST OBLIGATOIRE ET INFAILLIBLE
  const roleData = await getRoleLevelByUserId(session.user.id)

  if (!roleData) {
    throw new AuthorizationError('Aucun rôle assigné', 'NO_ROLE')
  }

  if (roleData.isBlocked) {
    throw new AuthorizationError(
      roleData.blockReason
        ? `Compte bloqué: ${roleData.blockReason}`
        : 'Compte bloqué',
      'ACCOUNT_BLOCKED'
    )
  }

  return {
    userId: session.user.id,
    roleLevel: roleData.level,
    roleName: roleData.roleName,
    roleData,
    prisma,
  }
}

// ─── Options d'audit déclaratives ───

/**
 * Configuration d'audit déclarative pour une opération sécurisée.
 * Permet à chaque service métier de faire capturer son action par
 * `recordAuditLog` (server/services/audit.service.ts) sans écrire à la main :
 *   - l'action en clair ("ACCOUNT_DELETE", "ROLE_UPDATE", "STOCK_ADJUST"...)
 *   - l'identifiant de la ressource cible (targetId)
 *   - l'ID de l'acteur, toujours issu du contexte de session sécurisé (ctx.userId)
 *   - le niveau de sévérité adapté (matrice INFO / WARNING / CRITICAL)
 * Les échecs (refus RBAC ou erreur métier) sont tracés avec le statut "FAILED".
 */
export type SecureAuditOptions<T> = {
  /** Action en clair, ex: "ACCOUNT_DELETE", "ROLE_UPDATE", "STOCK_ADJUST". */
  action: string
  /** Sévérité selon la matrice d'audit ; omise → résolution automatique via
   *  `resolveAuditSeverity(action)` (INFO / WARNING / CRITICAL). */
  severity?: AuditSeverity
  /** Type de ressource cible: "ROLE", "USER", "ACCOUNT", "ORDER", "PRODUCT"... */
  targetType?: string
  /** Identifiant de la ressource cible (statique ou résolu depuis le résultat). */
  targetId?: string | ((result: T) => string | undefined | null)
  /** Journaliser l'entrée après succès (défaut: true). */
  success?: boolean
  /** Journaliser l'entrée en cas d'échec (défaut: true). */
  failure?: boolean
  /** Détails riches: objet statique ou fonction du résultat de l'opération. */
  details?:
    | Record<string, unknown>
    | ((result: T) => Record<string, unknown> | undefined)
}

// ─── Fonction principale : withSecurePrisma ───

export async function withSecurePrisma<T>(
  operation: (ctx: SecureContext) => Promise<T>,
  options: {
    minRoleLevel?: number
    requiredPermissions?: PermissionCode[]
    requireAll?: boolean
    blockDangerous?: boolean
    auditLog?: boolean
    audit?: SecureAuditOptions<T>
    customCheck?: (ctx: SecureContext) => boolean | Promise<boolean>
  } = {}
): Promise<T> {

  // 1. CONSTRUCTION DU CONTEXTE (impossible à oublier)
  let ctx: SecureContext
  try {
    ctx = await buildSecureContext()
  } catch (error) {
    // Session absente / rôle absent : la tentative est un événement de
    // sécurité pour toute opération déclarée auditable.
    if (options.audit && options.audit.failure !== false) {
      const message =
        error instanceof Error ? error.message : 'Authentification requise'
      await recordAuditLog({
        action: options.audit.action,
        targetId:
          typeof options.audit.targetId === 'string'
            ? options.audit.targetId
            : undefined,
        userId: await getAuditActorId(),
        severity: AuditSeverity.CRITICAL,
        status: 'FAILED',
        targetType: options.audit.targetType,
        details: {
          error: message,
          code:
            error instanceof AuthorizationError ? error.code : 'UNAUTHENTICATED',
        },
        error: message,
      })
    }
    throw error
  }

  const audit = options.audit

  try {

  // 2. Vérification niveau minimum
  if (options.minRoleLevel !== undefined && ctx.roleLevel > options.minRoleLevel) {
    throw new AuthorizationError(
      `Niveau ${options.minRoleLevel} ou supérieur requis (actuel: ${ctx.roleLevel})`,
      'INSUFFICIENT_LEVEL'
    )
  }

  // 3. Vérification permissions granulaires
  if (options.requiredPermissions && options.requiredPermissions.length > 0) {
    const checkFn = options.requireAll !== false
      ? hasAllPermissionsOnResult
      : hasAnyPermissionOnResult

    if (!checkFn(ctx.roleData, options.requiredPermissions)) {
      const missing = options.requiredPermissions.filter(
        p => !ctx.roleData.permissions.includes(p)
      )
      throw new AuthorizationError(
        `Permissions manquantes: ${missing.join(', ')}`,
        'MISSING_PERMISSIONS'
      )
    }
  }

  // 4. Vérification permissions dangereuses
  if (options.blockDangerous !== false) {
    const dangerousRequested = options.requiredPermissions?.filter(
      p => isDangerousPermission(p)
    )
    if (dangerousRequested && dangerousRequested.length > 0 && ctx.roleLevel > 1) {
      console.warn(`[AUDIT] Opération dangereuse par ${ctx.userId} (level ${ctx.roleLevel}): ${dangerousRequested.join(', ')}`)
    }
  }

  // 5. Vérification custom
  if (options.customCheck) {
    const allowed = await options.customCheck(ctx)
    if (!allowed) {
      throw new AuthorizationError('Vérification personnalisée échouée', 'CUSTOM_CHECK_FAILED')
    }
  }

  // 6. Audit log (hérité `auditLog: true`) — redirigé vers recordAuditLog
  //    pour bénéficier du snapshot acteur frais (actorName / actorEmail).
  if (options.auditLog) {
    try {
      await recordAuditLog({
        userId: ctx.userId,
        roleLevel: ctx.roleLevel,
        action: 'OPERATION',
        severity: AuditSeverity.INFO,
        details: {
          permissions: options.requiredPermissions,
          minLevel: options.minRoleLevel,
        },
      })
    } catch {
      // Ne pas faire échouer l'opération si l'audit échoue
      console.error('[AUDIT] Échec de l\u00e9criture du log d\u2019audit')

    }
  }

  // 7. EXÉCUTION + AUDIT DÉCLARATIF (succès ou échec, jamais bloquant)
    const result = await operation(ctx)

    if (audit && audit.success !== false) {
      const resolvedDetails =
        typeof audit.details === 'function'
          ? audit.details(result)
          : audit.details
      const resolvedTargetId =
        typeof audit.targetId === 'function'
          ? (audit.targetId(result) ?? undefined)
          : audit.targetId
      await recordAuditLog({
        action: audit.action,
        targetId: resolvedTargetId,
        userId: ctx.userId,
        roleLevel: ctx.roleLevel,
        // Sévérité déclarée, sinon résolution via la matrice (resolveAuditSeverity)
        severity: audit.severity,
        status: 'SUCCESS',
        targetType: audit.targetType,
        details: resolvedDetails,
      })
    }

    return result
  } catch (error) {
    // Refus RBAC ou erreur métier : la tentative est tracée avec statut
    // "FAILED". Une tentative refusée sur une opération auditable est un
    // événement de sécurité → sévérité CRITICAL.
    if (audit && audit.failure !== false) {
      const message =
        error instanceof Error ? error.message : 'Échec inattendu'
      const fallbackTargetId =
        typeof audit.targetId === 'string' ? audit.targetId : undefined
      await recordAuditLog({
        action: audit.action,
        targetId: fallbackTargetId,
        userId: ctx.userId,
        roleLevel: ctx.roleLevel,
        severity:
          error instanceof AuthorizationError
            ? AuditSeverity.CRITICAL
            : audit.severity,
        status: 'FAILED',
        targetType: audit.targetType,
        details: {
          error: message,
          code:
            error instanceof AuthorizationError
              ? error.code
              : error instanceof Error && 'code' in error
                ? (error as unknown as { code?: string }).code ||
                  'UNKNOWN_ERROR'
                : 'SERVICE_ERROR',
        },
        error: message,
      })
    }
    throw error
  }
}
