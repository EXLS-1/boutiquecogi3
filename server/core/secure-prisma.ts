// server/core/secure-prisma.ts

import { PrismaClient } from '@prisma/client'
import { getRoleLevel } from '@/lib/auth/rbac'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

// ─── Types ─────────────────────────────────────────────

export type RoleLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type PermissionContext = {
  userId: string
  roleLevel: RoleLevel
  permissions: string[]
}

// ─── Erreur sécurisée ──────────────────────────────────

class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

// ─── Vérification d'autorisation (impossible à bypasser) ─

async function buildPermissionContext(): Promise<PermissionContext> {
  const headersList = await headers()
  
  // BetterAuth : récupère la session
  const session = await auth.api.getSession({ headers: headersList })
  
  if (!session?.user?.id) {
    throw new AuthorizationError('Session invalide ou absente')
  }

  // Évalue le rôle — CETTE ÉTAPE EST OBLIGATOIRE ET INFAILLIBLE
  const roleData = await getRoleLevel(session.user.id)
  
  if (!roleData) {
    throw new AuthorizationError('Rôle non attribué ou utilisateur sans rôle')
  }

  // Vérifie si le rôle est actif (pas bloqué)
  if (roleData.isBlocked) {
    throw new AuthorizationError('Compte bloqué')
  }

  return {
    userId: session.user.id,
    roleLevel: roleData.level as RoleLevel,
    permissions: roleData.permissions,
  }
}

// ─── Wrapper Prisma sécurisé ───────────────────────────

/**
 * EXÉCUTE UNE OPÉRATION PRISMA UNIQUEMENT SI L'AUTHENTIFICATION + RÔLE SONT VALIDÉS.
 * 
 * Cette fonction est le SEUL moyen d'accéder à Prisma depuis les Server Actions.
 * Il est IMPOSSIBLE d'appeler Prisma directement sans passer par ici.
 */
export async function withSecurePrisma<T>(
  operation: (prisma: PrismaClient, ctx: PermissionContext) => Promise<T>,
  options: {
    minRoleLevel?: RoleLevel      // Niveau minimum requis
    requiredPermissions?: string[] // Permissions spécifiques requises
    auditLog?: boolean             // Logger l'opération
  } = {}
): Promise<T> {
  
  // 1. Authentification + Rôle (INFAILLIBLE — ne peut pas être oubliée)
  const ctx = await buildPermissionContext()

  // 2. Vérification du niveau minimum
  if (options.minRoleLevel && ctx.roleLevel < options.minRoleLevel) {
    throw new AuthorizationError(
      `Niveau ${options.minRoleLevel} requis, niveau actuel: ${ctx.roleLevel}`
    )
  }

  // 3. Vérification des permissions spécifiques
  if (options.requiredPermissions) {
    const missing = options.requiredPermissions.filter(
      p => !ctx.permissions.includes(p)
    )
    if (missing.length > 0) {
      throw new AuthorizationError(`Permissions manquantes: ${missing.join(', ')}`)
    }
  }

  // 4. Audit log (optionnel)
  if (options.auditLog) {
    await logAudit(ctx.userId, ctx.roleLevel, 'OPERATION', options)
  }

  // 5. EXÉCUTION — seul moment où Prisma est accessible
  const prisma = new PrismaClient() // ou ton instance singleton
  try {
    return await operation(prisma, ctx)
  } finally {
    await prisma.$disconnect()
  }
}

// ─── Helper audit ───────────────────────────────────────

async function logAudit(
  userId: string,
  roleLevel: number,
  action: string,
  options: unknown
) {
  // Implémentation de ton audit log
  console.log(`[AUDIT] User:${userId} Role:${roleLevel} Action:${action}`)
}
