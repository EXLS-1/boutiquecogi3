// server/services/user-admin-service.ts

import { withSecurePrisma } from '@/server/core/secure-prisma'
import { recordAuditLog } from '@/server/services/audit.service'
import { AuditSeverity } from '@prisma/client'
import { blockUserSchema, unblockUserSchema, assignRoleSchema } from '@/lib/validations/role.schema'
import { PERMISSIONS, ROLES, ROLE_HIERARCHY, getRoleLevel } from '@/lib/auth/rbac'
import type { BlockUserInput, UnblockUserInput, AssignRoleInput } from '@/lib/validations/role.schema'

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

     const { userId, reason, blockedUntil, permanent } = parsed.data
    return withSecurePrisma(
      async (ctx) => {
        const { userId, reason, blockedUntil, permanent } = parsed.data
        // 1. Ne pas se bloquer soi-même
        // 2. Vérifier que la cible existe
        const targetUser = await ctx.prisma.user.findUnique({
          where: { id: userId },
          include: { roleAssignment: { include: { roleConfig: true } } }
        })
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
          include: { roleAssignment: { include: { roleConfig: true } } }
        })

        if (!targetUser) {
          throw new UserAdminError('Utilisateur non trouvé', 'USER_NOT_FOUND')
        }

        // 3. Ne pas bloquer un SUPER_ADMIN (level 1)
        if (targetUser.roleAssignment?.roleConfig?.role === 'SUPER_ADMIN') {
          throw new UserAdminError(
            'Impossible de bloquer un SUPER_ADMIN',
            'SUPER_ADMIN_IMMUNITY'
          )
        }

        // 4. Ne pas bloquer un utilisateur déjà bloqué
        if (targetUser.roleAssignment?.isBlocked) {
          throw new UserAdminError(
            'Utilisateur déjà bloqué',
            'ALREADY_BLOCKED'
          )
        }

        // 5. Appliquer le blocage
        let updateData: any = {
          blockedUntil: blockedUntil ?? null,
          blockedBy: ctx.userId,
          permanent,
        }

        if (blockedUntil) {
          updateData.blockedUntil = blockedUntil
        }
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
          include: { roleAssignment: { include: { roleConfig: true } } }
        })

        if (!targetUser) {
          throw new UserAdminError('Utilisateur non trouvé', 'USER_NOT_FOUND')
        }

        // 3. Ne pas bloquer un SUPER_ADMIN (level 1)
        if (targetUser.roleAssignment?.roleConfig?.role === 'SUPER_ADMIN') {
          throw new UserAdminError(
            'Impossible de bloquer un SUPER_ADMIN',
            'SUPER_ADMIN_IMMUNITY'
          )
        }

        // 4. Ne pas bloquer un utilisateur déjà bloqué
        if (targetUser.roleAssignment?.isBlocked) {
          throw new UserAdminError(
            'Utilisateur déjà bloqué',
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
            user: { select: { email: true, name: true } }
          }
        })

        // ─── Audit log ───
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
        minRoleLevel: 2, // ADMIN+
        requiredPermissions: [PERMISSIONS['users:block']],
        // Traçabilité des ÉCHECS — le succès est journalisé ci-dessus.
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
          include: { roleAssignment: { include: { roleConfig: true } } }
        })

        if (!targetUser) {
          throw new UserAdminError('Utilisateur non trouvé', 'USER_NOT_FOUND')
        }

        // 3. Ne pas bloquer un SUPER_ADMIN (level 1)
        if (targetUser.roleAssignment?.roleConfig?.role === 'SUPER_ADMIN') {
          throw new UserAdminError(
            'Impossible de bloquer un SUPER_ADMIN',
            'SUPER_ADMIN_IMMUNITY'
          )
        }

        // 4. Ne pas bloquer un utilisateur déjà bloqué
        if (targetUser.roleAssignment?.isBlocked) {
          throw new UserAdminError(
            'Utilisateur déjà bloqué',
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
            user: { select: { email: true, name: true } }
          }
        })

        // ─── Audit log ───
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
        minRoleLevel: 2, // ADMIN+
        requiredPermissions: [PERMISSIONS['users:block']],
        // Traçabilité des ÉCHECS — le succès est journalisé ci-dessus.
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
          include: { roleAssignment: { include: { roleConfig: true } } }
        })

        if (!targetUser) {
          throw new UserAdminError('Utilisateur non trouvé', 'USER_NOT_FOUND')
        }

        // 3. Ne pas bloquer un SUPER_ADMIN (level 1)
        if (targetUser.roleAssignment?.roleConfig?.role === 'SUPER_ADMIN') {
          throw new UserAdminError(
            'Impossible de bloquer un SUPER_ADMIN',
            'SUPER_ADMIN_IMMUNITY'
          )
        }

        // 4. Ne pas bloquer un utilisateur déjà bloqué
        if (targetUser.roleAssignment?.isBlocked) {
          throw new UserAdminError(
            'Utilisateur déjà bloqué',
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
            user: { select: { email: true, name: true } }
          }
        })

        // ─── Audit log ───
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
        minRoleLevel: 2, // ADMIN+
        requiredPermissions: [PERMISSIONS['users:block']],
        // Traçabilité des ÉCHECS — le succès est journalisé ci-dessus.
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
        // 1. Ne pas se bloquer soi-même
        if (userId === ctx.userId) {
        // 2. Vérifier que la cible existe
        const targetUser = await ctx.prisma.user.findUnique({
          where: { id: userId },
          include: { roleAssignment: { include: { roleConfig: true } } }
        })
        // 2. Vérifier que la cible existe
        const targetUser = await ctx.prisma.user.findUnique({
          where: { id: userId },
          include: { roleAssignment: { include: { roleConfig: true } } }
        })
        // 1. Ne pas se bloquer soi-même
        if (userId === ctx.userId) {
          throw new UserAdminError(
            'Vous ne pouvez pas bloquer votre propre compte',
            'SELF_BLOCK_FORBIDDEN'
          )
        }

        // 2. Vérifier que la cible existe
        const targetUser = await ctx.prisma.user.findUnique({
        if (!targetUser) {
          throw new UserAdminError('Utilisateur non trouvé', 'USER_NOT_FOUND')
        }

        // 3. Ne pas bloquer un SUPER_ADMIN (level 1)
        if (!targetUser) {
          throw new UserAdminError('Utilisateur non trouvé', 'USER_NOT_FOUND')
        }

        // 3. Ne pas bloquer un SUPER_ADMIN (level 1)
        if (targetUser.roleAssignment?.roleConfig?.role === 'SUPER_ADMIN') {
          throw new UserAdminError(
            'Impossible de bloquer un SUPER_ADMIN',
            'SUPER_ADMIN_IMMUNITY'
          )
        }

        // 4. Ne pas bloquer un utilisateur déjà bloqué
        if (targetUser.roleAssignment?.isBlocked) {
        if (!targetUser) {
          throw new UserAdminError('Utilisateur non trouvé', 'USER_NOT_FOUND')
        }

        // 3. Ne pas bloquer un SUPER_ADMIN (level 1)
        if (targetUser.roleAssignment?.roleConfig?.role === 'SUPER_ADMIN') {
        if (targetUser.roleAssignment?.roleConfig?.role === 'SUPER_ADMIN') {
          where: { id: userId },
          include: { roleAssignment: { include: { roleConfig: true } } }
        })

        if (!targetUser) {
          throw new UserAdminError('Utilisateur non trouvé', 'USER_NOT_FOUND')
        }

        // 3. Ne pas bloquer un SUPER_ADMIN (level 1)
        if (targetUser.roleAssignment?.roleConfig?.role === 'SUPER_ADMIN') {
          throw new UserAdminError(
            'Impossible de bloquer un SUPER_ADMIN',
            'SUPER_ADMIN_IMMUNITY'
          )
          throw new UserAdminError(
            'Impossible de bloquer un SUPER_ADMIN',
            'SUPER_ADMIN_IMMUNITY'
          )
        }

        // 4. Ne pas bloquer un utilisateur déjà bloqué
        if (targetUser.roleAssignment?.isBlocked) {
        }

        // 4. Ne pas bloquer un utilisateur déjà bloqué
        if (targetUser.roleAssignment?.isBlocked) {
          throw new UserAdminError(
            'Utilisateur déjà bloqué',
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
          throw new UserAdminError(
            'Utilisateur déjà bloqué',
            'ALREADY_BLOCKED'
          )
        }

        // 5. Vérifier la cohérence temporelle
        if (!permanent && !blockedUntil) {

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
          throw new UserAdminError(
            'Précisez une date de fin ou cochez "permanent"',
            'INVALID_BLOCK_DURATION'
          )
        }

        if (blockedUntil && blockedUntil < new Date()) {
          include: {
            user: { select: { email: true, name: true } }
          }
        })

        // ─── Audit log ───
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
            user: { select: { email: true, name: true } }
          }
        })

        // ─── Audit log ───
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
        minRoleLevel: 2, // ADMIN+
        requiredPermissions: [PERMISSIONS['users:block']],
        // Traçabilité des ÉCHECS — le succès est journalisé ci-dessus.
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
        minRoleLevel: 2, // ADMIN+
        requiredPermissions: [PERMISSIONS['users:block']],
        // Traçabilité des ÉCHECS — le succès est journalisé ci-dessus.
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
          include: { roleAssignment: { include: { roleConfig: true } } }
        })

        if (!targetUser) {
          throw new UserAdminError('Utilisateur non trouvé', 'USER_NOT_FOUND')
        }

        // 3. Ne pas bloquer un SUPER_ADMIN (level 1)
        if (targetUser.roleAssignment?.roleConfig?.role === 'SUPER_ADMIN') {
          throw new UserAdminError(
            'Impossible de bloquer un SUPER_ADMIN',
            'SUPER_ADMIN_IMMUNITY'
          )
        }

        // 4. Ne pas bloquer un utilisateur déjà bloqué
        if (targetUser.roleAssignment?.isBlocked) {
          throw new UserAdminError(
            'Utilisateur déjà bloqué',
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
            user: { select: { email: true, name: true } }
          }
        })

        // ─── Audit log ───
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
        minRoleLevel: 2, // ADMIN+
        requiredPermissions: [PERMISSIONS['users:block']],
        // Traçabilité des ÉCHECS — le succès est journalisé ci-dessus.
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
          include: { roleAssignment: { include: { roleConfig: true } } }
        })

        if (!targetUser) {
          throw new UserAdminError('Utilisateur non trouvé', 'USER_NOT_FOUND')
        }

        // 3. Ne pas bloquer un SUPER_ADMIN (level 1)
        if (targetUser.roleAssignment?.roleConfig?.role === 'SUPER_ADMIN') {
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
            user: { select: { email: true, name: true } }
          }
        })

        // ─── Audit log ───
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
        minRoleLevel: 2, // ADMIN+
        requiredPermissions: [PERMISSIONS['users:block']],
        // Traçabilité des ÉCHECS — le succès est journalisé ci-dessus.
        audit: {
          action: 'USER_BLOCK',
          severity: AuditSeverity.WARNING,
          targetType: 'USER',
           targetId: userId,
          targetId: userId,
          success: false,
        },
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
        // Traçabilité des ÉCHECS — le succès est journalisé ci-dessus.
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
   * Lister les utilisateurs bloqués (Admin+)
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
          include: { roleAssignment: { include: { roleConfig: true } } }
        })

        if (!targetUser) {
          throw new UserAdminError('Utilisateur non trouvé', 'USER_NOT_FOUND')
        }

        const role = await ctx.prisma.roleConfig.findUnique({
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
        if (targetUser.roleAssignment?.roleConfig?.role === 'SUPER_ADMIN') {
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
        // Traçabilité des ÉCHECS — le succès est journalisé ci-dessus.
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
   * Lister tous les utilisateurs avec leur rôle (Admin+)
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
