// server/services/user-admin-service.ts

import { withSecurePrisma } from '@/server/core/secure-prisma'
import { recordAuditLog } from '@/server/services/audit.service'
import { AuditSeverity } from '@prisma/client'
import { blockUserSchema, unblockUserSchema, assignRoleSchema } from '@/lib/validations/role.schema'
import { PERMISSIONS, ROLES, getRoleLevel } from '@/lib/auth/rbac'
import type { BlockUserInput, UnblockUserInput, AssignRoleInput } from '@/lib/validations/role.schema'

export class UserAdminError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'UserAdminError'
  }
}

export const UserAdminService = {
  /** Bloquer un utilisateur (Admin+). */
  async block(input: BlockUserInput) {
    const parsed = blockUserSchema.safeParse(input)
    if (!parsed.success) {
      throw new UserAdminError('Données invalides', 'VALIDATION_ERROR')
    }

    const { userId, reason, blockedUntil, permanent } = parsed.data

    return withSecurePrisma(
      async (ctx) => {
        if (userId === ctx.userId) {
          throw new UserAdminError(
            'Vous ne pouvez pas bloquer votre propre compte',
            'SELF_BLOCK_FORBIDDEN'
          )
        }

        const targetUser = await ctx.prisma.user.findUnique({
          where: { id: userId },
          include: { roleAssignment: { include: { roleConfig: true } } },
        })

        if (!targetUser) {
          throw new UserAdminError('Utilisateur non trouvé', 'USER_NOT_FOUND')
        }

        if (targetUser.roleAssignment?.roleConfig?.role === 'SUPER_ADMIN') {
          throw new UserAdminError(
            'Impossible de bloquer un SUPER_ADMIN',
            'SUPER_ADMIN_IMMUNITY'
          )
        }

        if (targetUser.roleAssignment?.isBlocked) {
          throw new UserAdminError('Utilisateur déjà bloqué', 'ALREADY_BLOCKED')
        }

        if (!permanent && !blockedUntil) {
          throw new UserAdminError(
            'Précisez une date de fin ou cochez "permanent"',
            'INVALID_BLOCK_DURATION'
          )
        }

        if (blockedUntil && blockedUntil <= new Date()) {
          throw new UserAdminError(
            'La date de fin doit être dans le futur',
            'PAST_DATE'
          )
        }

        await ctx.prisma.roleAssignment.update({
          where: { userId },
          data: {
            isBlocked: true,
            blockedReason: reason,
            blockedAt: new Date(),
            blockedUntil: permanent ? null : blockedUntil,
          },
        })

        await recordAuditLog({
          userId: ctx.userId,
          roleLevel: ctx.roleLevel,
          action: 'USER_BLOCK',
          targetId: userId,
          targetType: 'USER',
          severity: AuditSeverity.WARNING,
          details: {
            blockedUserEmail: targetUser.email,
            blockedUserName: targetUser.name,
            reason,
            blockedUntil: permanent ? 'PERMANENT' : blockedUntil?.toISOString(),
            blockedBy: ctx.userId,
            blockedByRole: ctx.roleName,
          },
        })

        return {
          success: true,
          userId,
          email: targetUser.email,
          blockedUntil: permanent ? null : blockedUntil,
          permanent,
          reason,
        }
      },
      {
        minRoleLevel: 2,
        requiredPermissions: [PERMISSIONS['users:block']],
        audit: {
          action: 'USER_BLOCK',
          severity: AuditSeverity.WARNING,
          targetType: 'USER',
          targetId: userId,
          success: false,
        },
      }
    )
  },
  async unblock(input: UnblockUserInput) {
    const parsed = unblockUserSchema.safeParse(input)
    if (!parsed.success) {
      throw new UserAdminError('DonnÃ©es invalides', 'VALIDATION_ERROR')
    }

    const { userId } = parsed.data

    return withSecurePrisma(
      async (ctx) => {
        const { reason } = parsed.data

        const targetUser = await ctx.prisma.user.findUnique({
          where: { id: userId },
          include: { roleAssignment: true }
        })

        if (!targetUser) {
          throw new UserAdminError('Utilisateur non trouvÃ©', 'USER_NOT_FOUND')
        }

        if (!targetUser.roleAssignment?.isBlocked) {
          throw new UserAdminError('Cet utilisateur n\u2019est pas bloqu\u00e9', 'NOT_BLOCKED')
        }


        await ctx.prisma.roleAssignment.update({
          where: { userId },
          data: {
            isBlocked: false,
            blockedReason: null,
            blockedAt: null,
            blockedUntil: null,
          }
        })

        await recordAuditLog({
          userId: ctx.userId,
          roleLevel: ctx.roleLevel,
          action: 'USER_UNBLOCK',
          targetId: userId,
          targetType: 'USER',
          severity: AuditSeverity.WARNING,
          details: {
            unblockedUserEmail: targetUser.email,
            reason: reason || 'Aucune raison fournie',
            unblockedBy: ctx.userId,
          },
        })

        return {
          success: true,
          userId,
          email: targetUser.email,
          unblockedAt: new Date(),
        }
      },
      {
        minRoleLevel: 2, // ADMIN+
        requiredPermissions: [PERMISSIONS['users:block']],
        // TraÃ§abilitÃ© des Ã‰CHECS â€” le succÃ¨s est journalisÃ© ci-dessus.
        audit: {
          action: 'USER_UNBLOCK',
          severity: AuditSeverity.WARNING,
          targetType: 'USER',
          targetId: userId,
          success: false,
        },
      }
    )
  },

  /**
   * Lister les utilisateurs bloquÃ©s (Admin+)
   */
  async listBlocked() {
    return withSecurePrisma(
      async (ctx) => {
        const blocked = await ctx.prisma.roleAssignment.findMany({
          where: { isBlocked: true },
          include: {
            user: { select: { id: true, email: true, name: true, createdAt: true } },
            roleConfig: { select: { role: true, level: true } }
          },
          orderBy: { blockedAt: 'desc' }
        })

        return blocked.map(b => ({
          assignmentId: b.id,
          userId: b.userId,
          email: b.user.email,
          name: b.user.name,
          role: b.roleConfig ? { name: b.roleConfig.role, level: b.roleConfig.level } : null,
          roleLevel: b.roleConfig ? getRoleLevel(b.roleConfig.role) : 7,
          blockedAt: b.blockedAt,
          blockedUntil: b.blockedUntil,
          blockedReason: b.blockedReason,
          isPermanent: b.blockedUntil === null,
        }))
      },
      {
        minRoleLevel: 2, // ADMIN+
        requiredPermissions: [PERMISSIONS['users:view:any']],
      }
    )
  },

  /**
   * Assigner un rÃ´le Ã  un utilisateur (Admin+)
   */
  async assignRole(input: AssignRoleInput) {
    const parsed = assignRoleSchema.safeParse(input)
    if (!parsed.success) {
      throw new UserAdminError('DonnÃ©es invalides', 'VALIDATION_ERROR')
    }

    const { userId } = parsed.data

    return withSecurePrisma(
      async (ctx) => {
        const { roleId } = parsed.data

        const targetUser = await ctx.prisma.user.findUnique({
          where: { id: userId },
          include: { roleAssignment: { include: { roleConfig: true } } }
        })

        if (!targetUser) {
          throw new UserAdminError('Utilisateur non trouvÃ©', 'USER_NOT_FOUND')
        }

        const role = await ctx.prisma.roleConfig.findUnique({
          where: { id: roleId }
        })

        if (!role) {
          throw new UserAdminError('RÃ´le non trouvÃ©', 'ROLE_NOT_FOUND')
        }

        // Protection : ne pas assigner SUPER_ADMIN (level 1) manuellement
        if (role.level === 1) {
          throw new UserAdminError(
            'Le rÃ´le SUPER_ADMIN ne peut pas Ãªtre assignÃ© manuellement',
            'SUPER_ADMIN_ASSIGNMENT_FORBIDDEN'
          )
        }

        // Protection : ne pas modifier un SUPER_ADMIN existant
        if (targetUser.roleAssignment?.roleConfig?.role === 'SUPER_ADMIN') {
          throw new UserAdminError(
            'Impossible de modifier le rÃ´le d\u2019un SUPER_ADMIN',
            'SUPER_ADMIN_IMMUNITY'
          )
        }


        // Ne pas se rÃ©trograder soi-mÃªme
        if (userId === ctx.userId && role.level > ctx.roleLevel) {
          throw new UserAdminError(
            'Vous ne pouvez pas vous rÃ©trograder vous-mÃªme',
            'SELF_DEMOTION_FORBIDDEN'
          )
        }

        const assignment = await ctx.prisma.roleAssignment.upsert({
          where: { userId },
          update: {
            roleId: role.id,
            assignedBy: ctx.userId,
            assignedAt: new Date(),
            isBlocked: false,
            blockedReason: null,
            blockedAt: null,
            blockedUntil: null,
          },
          create: {
            userId,
            roleId: role.id,
            assignedBy: ctx.userId,
          }
        })

        await recordAuditLog({
          userId: ctx.userId,
          roleLevel: ctx.roleLevel,
          action: 'ROLE_ASSIGN',
          targetId: userId,
          targetType: 'USER',
          severity: AuditSeverity.WARNING,
          details: {
            assignedRole: role.role,
            assignedRoleLevel: role.level,
            previousRole: targetUser.roleAssignment?.roleConfig?.role,
          },
        })

        return {
          success: true,
          userId,
          assignedRole: role.role,
          assignedAt: assignment.assignedAt,
        }
      },
      {
        minRoleLevel: 2, // ADMIN+
        requiredPermissions: [PERMISSIONS['role:assign']],
        // TraÃ§abilitÃ© des Ã‰CHECS â€” le succÃ¨s est journalisÃ© ci-dessus.
        audit: {
          action: 'ROLE_ASSIGN',
          severity: AuditSeverity.WARNING,
          targetType: 'USER',
          targetId: userId,
          success: false,
        },
      }
    )
  },

  /**
   * Lister tous les utilisateurs avec leur rÃ´le (Admin+)
   */
  async listUsers() {
    return withSecurePrisma(
      async (ctx) => {
        const users = await ctx.prisma.user.findMany({
          include: {
            roleAssignment: { include: { roleConfig: true } }
          },
          orderBy: { createdAt: 'desc' }
        })

        return users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          createdAt: u.createdAt,
          role: u.roleAssignment?.roleConfig?.role ?? ROLES.GUEST,
          roleLevel: u.roleAssignment?.roleConfig ? getRoleLevel(u.roleAssignment.roleConfig.role) : 7,
          isBlocked: u.roleAssignment?.isBlocked ?? false,
        }))
      },
      {
        minRoleLevel: 2,
        requiredPermissions: [PERMISSIONS['users:view:any']],
      }
    )
  }
}
