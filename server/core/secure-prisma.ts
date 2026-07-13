// src/server/core/secure-prisma.ts (mise à jour)

import { PrismaClient } from '@prisma/client'
import { getRoleLevel,
  hasPermission,
  type RoleEvaluationResult,
  type PermissionCode,
  type RoleLevel,
  getRequiredLevelForPermission
} from '@/lib/auth/rbac'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

// ─── Contexte enrichi ───

export type SecureContext = {
  userId: string
  roleLevel: RoleLevel
  roleName: string
  roleData: RoleEvaluationResult
  prisma: PrismaClient
}

class AuthorizationError extends Error {
  constructor(message: string, public code: string = 'FORBIDDEN') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

// ─── Instance Prisma singleton ───

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// ─── Vérification d'autorisation (INFAILLIBLE) ───

async function buildSecureContext(): Promise<SecureContext> {
  const headersList = await headers()
  
  const session = await auth.api.getSession({ headers: headersList })
  
  if (!session?.user?.id) {
    throw new AuthorizationError('Authentification requise', 'UNAUTHENTICATED')
  }

  const roleData = await getRoleLevel(session.user.id)
  
  if (!roleData) {
    throw new AuthorizationError('Aucun rôle assigné', 'NO_ROLE')
  }

  if (roleData.isBlocked) {
    throw new AuthorizationError('Compte bloqué', 'ACCOUNT_BLOCKED')
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
    minRoleLevel?: RoleLevel
    requiredPermissions?: PermissionCode[]
    requireAll?: boolean // true = AND, false = OR (défaut: true)
    blockDangerous?: boolean // bloquer les permissions dangereuses par défaut
    auditLog?: boolean
    customCheck?: (ctx: SecureContext) => boolean | Promise<boolean>
  } = {}
): Promise<T> {
  
  // 1. CONSTRUCTION DU CONTEXTE (impossible à oublier)
  const ctx = await buildSecureContext()

  // 2. Vérification niveau minimum
  if (options.minRoleLevel && ctx.roleLevel < options.minRoleLevel) {
    throw new AuthorizationError(
      `Niveau ${options.minRoleLevel} requis (actuel: ${ctx.roleLevel})`,
      'INSUFFICIENT_LEVEL'
    )
  }

  // 3. Vérification permissions granulaires
  if (options.requiredPermissions && options.requiredPermissions.length > 0) {
    const checkFn = options.requireAll !== false ? hasAllPermissions : hasAnyPermission
    
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
      p => getRequiredLevelForPermission(p) >= 6 // ou isDangerousPermission
    )
    if (dangerousRequested && dangerousRequested.length > 0 && ctx.roleLevel < 7) {
      // Log supplémentaire pour les ops dangereuses
      console.warn(`[AUDIT] Opération dangereuse par ${ctx.userId}: ${dangerousRequested.join(', ')}`)
    }
  }

  // 5. Vérification custom (pour cas spécifiques)
  if (options.customCheck) {
    const allowed = await options.customCheck(ctx)
    if (!allowed) {
      throw new AuthorizationError('Vérification personnalisée échouée', 'CUSTOM_CHECK_FAILED')
    }
  }

  // 6. Audit log
  if (options.auditLog) {
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
  }

  // 7. EXÉCUTION
  return await operation(ctx)
}

// ─── Helpers pour les services ───

function hasAllPermissions(roleData: RoleEvaluationResult, perms: PermissionCode[]): boolean {
  return perms.every(p => roleData.permissions.includes(p))
}

function hasAnyPermission(roleData: RoleEvaluationResult, perms: PermissionCode[]): boolean {
  return perms.some(p => roleData.permissions.includes(p))
}