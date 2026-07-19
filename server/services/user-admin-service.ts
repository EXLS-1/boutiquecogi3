// server/services/user-admin-service.ts

import { withSecurePrisma } from '@/server/core/secure-prisma'
import { blockUserSchema, unblockUserSchema, assignRoleSchema } from '@/lib/validations/role'
import { PERMISSIONS, ROLES, ROLE_HIERARCHY } from '@/lib/auth/rbac'
import type { BlockUserInput, UnblockUserInput, AssignRoleInput } from '@/lib/validations/role'

export class UserAdminError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'UserAdminError'
  }
}

export const UserAdminService = {
  /**
   * Bloquer un utilisateur (Admin+)
   */
  async block(input: BlockUserInput) {
    const parsed = blockUserSchema.safeParse(input)
    if (!parsed.success) {
      throw new UserAdminError('Données invalides', 'VALIDATION_ERROR')
    }

    return withSecurePrisma(
      async (ctx) => {
        const { userId, reason, blockedUntil, permanent } = parsed.data

        // 1. Ne pas se bloquer soi-même
        if (userId === ctx.userId) {
          throw new UserAdminError(
            'Vous ne pouvez pas bloquer votre propre compte',
            'SELF_BLOCK_FORBIDDEN'
          )
        }

        // 2. Vérifier que la cible existe
        const targetUser = await ctx.prisma.user.findUnique({
          where: { id: userId },
          include: { roleAssignment: { include: { role: true } } }
        })

        if (!targetUser) {
          throw new UserAdminError('Utilisateur non trouvé', 'USER_NOT_FOUND')
        }

        // 3. Ne pas bloquer un SUPER_ADMIN (level 1)
        if (targetUser.roleAssignment?.role.level === 1) {
          throw new UserAdminError(
            'Impossible de bloquer un SUPER_ADMIN',
            'SUPER_ADMIN_IMMUNITY'
          )
        }

        // 4. Ne pas bloquer un utilisateur déjà bloqué
        if (targetUser.roleAssignment?.isBlocked) {
          throw new UserAdminError(
            'Cet utilisateur est déjà bloqué',
            'ALREADY_BLOCKED'
          )
        }

        // 5. Vérifier la cohérence temporelle
        if (!permanent && !blockedUntil) {
          throw new UserAdminError(
            'Précisez une date de fin ou cochez "permanent"',
            'INVALID_BLOCK_DURATION'
          )
        }

        if (blockedUntil && blockedUntil < new Date()) {
          throw new UserAdminError(
            'La date de fin doit être dans le futur',
            'PAST_DATE'
          )
        }

        // ─── Exécution atomique ───
        const assignment = await ctx.prisma.roleAssignment.update({
          where: { userId },
          data: {
            isBlocked: true,
            blockedReason: reason,
            blockedAt: new Date(),
            blockedUntil: permanent ? null : blockedUntil,
          },
          include: {
            role: true,
            user: { select: { email: true, name: true } }
          }
        })

        // ─── Audit log ───
        await ctx.prisma.auditLog.create({
          data: {
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'USER_BLOCKED',
            targetId: userId,
            targetType: 'USER',
            details: JSON.stringify({
              blockedUserEmail: targetUser.email,
              blockedUserName: targetUser.name,
              reason,
              blockedUntil: permanent ? 'PERMANENT' : blockedUntil?.toISOString(),
              blockedBy: ctx.userId,
              blockedByRole: ctx.roleName,
            }),
          }
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
        minRoleLevel: 2, // ADMIN+
        requiredPermissions: [PERMISSIONS['users:block']],
        auditLog: true,
      }
    )
  },

  /**
   * Débloquer un utilisateur (Admin+)
   */
  async unblock(input: UnblockUserInput) {
    const parsed = unblockUserSchema.safeParse(input)
    if (!parsed.success) {
      throw new UserAdminError('Données invalides', 'VALIDATION_ERROR')
    }

    return withSecurePrisma(
      async (ctx) => {
        const { userId, reason } = parsed.data

        const targetUser = await ctx.prisma.user.findUnique({
          where: { id: userId },
          include: { roleAssignment: true }
        })

        if (!targetUser) {
          throw new UserAdminError('Utilisateur non trouvé', 'USER_NOT_FOUND')
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

        await ctx.prisma.auditLog.create({
          data: {
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'USER_UNBLOCKED',
            targetId: userId,
            targetType: 'USER',
            details: JSON.stringify({
              unblockedUserEmail: targetUser.email,
              reason: reason || 'Aucune raison fournie',
              unblockedBy: ctx.userId,
            }),
          }
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
        auditLog: true,
      }
    )
  },

  /**
   * Lister les utilisateurs bloqués (Admin+)
   */
  async listBlocked() {
    return withSecurePrisma(
      async (ctx) => {
        const blocked = await ctx.prisma.roleAssignment.findMany({
          where: { isBlocked: true },
          include: {
            user: { select: { id: true, email: true, name: true, createdAt: true } },
            role: { select: { name: true, level: true } }
          },
          orderBy: { blockedAt: 'desc' }
        })

        return blocked.map(b => ({
          assignmentId: b.id,
          userId: b.userId,
          email: b.user.email,
          name: b.user.name,
          role: b.role.name,
          roleLevel: b.role.level,
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
   * Assigner un rôle à un utilisateur (Admin+)
   */
  async assignRole(input: AssignRoleInput) {
    const parsed = assignRoleSchema.safeParse(input)
    if (!parsed.success) {
      throw new UserAdminError('Données invalides', 'VALIDATION_ERROR')
    }

    return withSecurePrisma(
      async (ctx) => {
        const { userId, roleId } = parsed.data

        const targetUser = await ctx.prisma.user.findUnique({
          where: { id: userId },
          include: { roleAssignment: { include: { role: true } } }
        })

        if (!targetUser) {
          throw new UserAdminError('Utilisateur non trouvé', 'USER_NOT_FOUND')
        }

        const role = await ctx.prisma.role.findUnique({
          where: { id: roleId }
        })

        if (!role) {
          throw new UserAdminError('Rôle non trouvé', 'ROLE_NOT_FOUND')
        }

        // Protection : ne pas assigner SUPER_ADMIN (level 1) manuellement
        if (role.level === 1) {
          throw new UserAdminError(
            'Le rôle SUPER_ADMIN ne peut pas être assigné manuellement',
            'SUPER_ADMIN_ASSIGNMENT_FORBIDDEN'
          )
        }

        // Protection : ne pas modifier un SUPER_ADMIN existant
        if (targetUser.roleAssignment?.role.level === 1) {
          throw new UserAdminError(
            'Impossible de modifier le rôle d\u2019un SUPER_ADMIN',
            'SUPER_ADMIN_IMMUNITY'
          )
        }


        // Ne pas se rétrograder soi-même
        if (userId === ctx.userId && role.level > ctx.roleLevel) {
          throw new UserAdminError(
            'Vous ne pouvez pas vous rétrograder vous-même',
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

        await ctx.prisma.auditLog.create({
          data: {
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'ROLE_ASSIGNED',
            targetId: userId,
            targetType: 'USER',
            details: JSON.stringify({
              assignedRole: role.name,
              assignedRoleLevel: role.level,
              previousRole: targetUser.roleAssignment?.role.name,
            }),
          }
        })

        return {
          success: true,
          userId,
          assignedRole: role.name,
          assignedAt: assignment.assignedAt,
        }
      },
      {
        minRoleLevel: 2, // ADMIN+
        requiredPermissions: [PERMISSIONS['role:assign']],
        auditLog: true,
      }
    )
  },

  /**
   * Lister tous les utilisateurs avec leur rôle (Admin+)
   */
  async listUsers() {
    return withSecurePrisma(
      async (ctx) => {
        const users = await ctx.prisma.user.findMany({
          include: {
            roleAssignment: {
              include: {
                role: { select: { name: true, level: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        })

        return users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          createdAt: u.createdAt,
          role: u.roleAssignment?.role.name ?? 'GUEST',
          roleLevel: u.roleAssignment?.role.level ?? 7,
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
