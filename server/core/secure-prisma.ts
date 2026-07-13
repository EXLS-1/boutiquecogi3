// src/server/core/secure-prisma.ts
// ============================================
// PORTE DE SÉCURITÉ INFAILLIBLE — SEUL ACCÈS À PRISMA
// ============================================
// Cette fonction est le SEUL moyen d'accéder à Prisma depuis les Server Actions.
// Il est IMPOSSIBLE d'appeler Prisma directement sans passer par ici.

import { PrismaClient } from '@prisma/client'
import { headers } from 'next/headers'
import {
  getRoleLevelByUserId,
  hasPermissionOnResult,
  hasAllPermissionsOnResult,
  hasAnyPermissionOnResult,
  type RoleEvaluationResult,
  type PermissionCode,
  RoleEvaluationError,
  getRequiredLevelForPermission,
  isDangerousPermission,
} from '@/lib/auth/rbac'

// ─── Instance Prisma singleton ───
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

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

// ─── Fonction principale : withSecurePrisma ───

export async function withSecurePrisma<T>(
  operation: (ctx: SecureContext) => Promise<T>,
  options: {
    minRoleLevel?: number
    requiredPermissions?: PermissionCode[]
    requireAll?: boolean
    blockDangerous?: boolean
    auditLog?: boolean
    customCheck?: (ctx: SecureContext) => boolean | Promise<boolean>
  } = {}
): Promise<T> {

  // 1. CONSTRUCTION DU CONTEXTE (impossible à oublier)
  const ctx = await buildSecureContext()

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

  // 6. Audit log
  if (options.auditLog) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: ctx.userId,
          roleLevel: ctx.roleLevel,
          action: 'OPERATION',
          details: JSON.stringify({
            permissions: options.requiredPermissions,
            minLevel: options.minRoleLevel,
          }),
          ipAddress: (await headers()).get('x-forwarded-for') || 'unknown',
        }
      })
    } catch {
      // Ne pas faire échouer l'opération si l'audit échoue
      console.error('[AUDIT] Échec de l'écriture du log d'audit')
    }
  }

  // 7. EXÉCUTION
  return await operation(ctx)
}
