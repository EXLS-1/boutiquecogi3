// server/services/role-service.ts

import { withSecurePrisma } from '@/server/core/secure-prisma'
import { createRoleSchema, type CreateRoleInput, type UpdateRoleInput } from '@/lib/validations/role'
import { PERMISSIONS, ROLE_HIERARCHY } from '@/lib/auth/rbac'

export class RoleServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'RoleServiceError'
  }
}

export const RoleService = {
  /**
   * Créer un nouveau rôle dans la hiérarchie (SUPER_ADMIN uniquement)
   */
  async create(input: CreateRoleInput) {
    const parsed = createRoleSchema.safeParse(input)
    if (!parsed.success) {
      throw new RoleServiceError('Données invalides', 'VALIDATION_ERROR')
    }

    return withSecurePrisma(
      async (ctx) => {
        // ➜ Logique consolidée dans
        //    `RoleConfig` + `RolePermission` (rôle identifié par le niveau → Role enum)

        // 1. Déterminer le rôle système à partir du niveau (RoleConfig.role est un Role enum)
        const roleNameFromLevel = ROLE_HIERARCHY[parsed.data.level]?.name ?? 'USER'

        // 2. Vérifier que les permissions demandées existent
        const permissions = await ctx.prisma.permission.findMany({
          where: { code: { in: parsed.data.defaultPermissionCodes } }
        })

        const foundCodes = permissions.map(p => p.code)
        const missingCodes = parsed.data.defaultPermissionCodes.filter(
          c => !foundCodes.includes(c)
        )

        if (missingCodes.length > 0) {
          throw new RoleServiceError(
            `Permissions inconnues: ${missingCodes.join(', ')}`,
            'UNKNOWN_PERMISSIONS'
          )
        }

        // 3. Upsert du RoleConfig
        const roleConfig = await ctx.prisma.roleConfig.upsert({
          where: { role: roleNameFromLevel },
          update: {
            level: parsed.data.level,
            description: parsed.data.description || `Rôle système ${roleNameFromLevel}`,
            isActive: parsed.data.isActive,
          },
          create: {
            role: roleNameFromLevel,
            level: parsed.data.level,
            description: parsed.data.description || `Rôle système ${roleNameFromLevel}`,
            permissions: {},
            restrictions: {},
            isActive: parsed.data.isActive,
          }
        })

        // 4. Remplacer les permissions relation (RolePermission)
        await ctx.prisma.rolePermission.deleteMany({
          where: { roleconfigId: roleConfig.id }
        })
        if (permissions.length > 0) {
          await ctx.prisma.rolePermission.createMany({
            data: permissions.map(p => ({
              roleconfigId: roleConfig.id,
              permissionId: p.id,
            }))
          })
        }

        const perms = await ctx.prisma.rolePermission.findMany({
          where: { roleconfigId: roleConfig.id },
          include: { permission: true }
        })

        // ─── Audit log ───
        await ctx.prisma.auditLog.create({
          data: {
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'ROLE_CREATED',
            targetId: roleConfig.id,
            targetType: 'ROLE',
            details: JSON.stringify({
              roleName: roleNameFromLevel,
              level: roleConfig.level,
              permissions: parsed.data.defaultPermissionCodes,
              createdBy: ctx.userId,
            }),
          }
        })

        return {
          id: roleConfig.id,
          name: roleNameFromLevel,
          level: roleConfig.level,
          description: roleConfig.description,
          isActive: roleConfig.isActive,
          permissions: perms.map(p => p.permission.code),
          createdAt: roleConfig.createdAt,
        }
      },
      {
        minRoleLevel: 1, // SUPER_ADMIN uniquement
        requiredPermissions: [PERMISSIONS['role:create']],
        auditLog: true,
        customCheck: (ctx) => ctx.roleLevel === 1, // Double sécurité
      }
    )
  },

  /**
   * Lister tous les rôles (Admin+)
   */
  async list() {
    return withSecurePrisma(
      async (ctx) => {
        const roles = await ctx.prisma.roleConfig.findMany({
          include: {
            rolePermissions: {
              include: { permission: { select: { code: true, name: true } } }
            },
            _count: { select: { roleAssignments: true } }
          },
          orderBy: { level: 'asc' }
        })

        return roles.map(role => ({
          id: role.id,
          name: role.role,
          level: role.level,
          description: role.description,
          isActive: role.isActive,
          userCount: role._count.roleAssignments,
          permissions: role.rolePermissions.map(rp => ({
            code: rp.permission.code,
            name: rp.permission.name,
          })),
        }))
      },
      {
        minRoleLevel: 2, // ADMIN+
        requiredPermissions: [PERMISSIONS['role:view']],
      }
    )
  },

  /**
   * Modifier un rôle (SUPER_ADMIN uniquement)
   */
  async update(
    roleId: string,
    data: UpdateRoleInput
  ) {
    return withSecurePrisma(
      async (ctx) => {
        const role = await ctx.prisma.roleConfig.findUnique({
          where: { id: roleId }
        })

        if (!role) {
          throw new RoleServiceError('Rôle non trouvé', 'NOT_FOUND')
        }

        // Protection : impossible de modifier SUPER_ADMIN (level 1) ou GUEST (level 7)
        if (role.level === 1 || role.level === 7) {
          throw new RoleServiceError(
            `Le rôle ${ROLE_HIERARCHY[role.level]?.name} est immuable`,
            'IMMUTABLE_ROLE'
          )
        }

        if (data.defaultPermissionCodes) {
          const permissions = await ctx.prisma.permission.findMany({
            where: { code: { in: data.defaultPermissionCodes } }
          })

          // Remplacer les permissions relationnelles (RolePermission)
          await ctx.prisma.rolePermission.deleteMany({
            where: { roleconfigId: roleId }
          })

          // Créer les nouvelles permissions
          if (permissions.length > 0) {
            await ctx.prisma.rolePermission.createMany({
              data: permissions.map(p => ({
                roleconfigId: roleId,
                permissionId: p.id,
              }))
            })
          }
        }

        const updated = await ctx.prisma.roleConfig.update({
          where: { id: roleId },
          data: {
            description: data.description,
            isActive: data.isActive,
          }
        })

        await ctx.prisma.auditLog.create({
          data: {
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'ROLE_UPDATED',
            targetId: roleId,
            targetType: 'ROLE',
            details: JSON.stringify({ changes: data }),
          }
        })

        return updated
      },
      {
        minRoleLevel: 1,
        requiredPermissions: [PERMISSIONS['role:edit']],
      }
    )
  },

  /**
   * Supprimer un rôle (SUPER_ADMIN uniquement, impossible si utilisateurs assignés)
   */
  async delete(roleId: string) {
    return withSecurePrisma(
      async (ctx) => {
        const role = await ctx.prisma.roleConfig.findUnique({
          where: { id: roleId },
          include: {
            _count: { select: { roleAssignments: true } }
          }
        })

        if (!role) {
          throw new RoleServiceError('Rôle non trouvé', 'NOT_FOUND')
        }

        if (role.level === 1 || role.level === 7) {
          throw new RoleServiceError(
            `Impossible de supprimer le rôle ${ROLE_HIERARCHY[role.level]?.name}`,
            'IMMUTABLE_ROLE'
          )
        }

        if (role._count.roleAssignments > 0) {
          throw new RoleServiceError(
            `Impossible de supprimer: ${role._count.roleAssignments} utilisateur(s) assigné(s)`,
            'ROLE_IN_USE'
          )
        }

        await ctx.prisma.$transaction([
          ctx.prisma.rolePermission.deleteMany({ where: { roleconfigId: roleId } }),
          ctx.prisma.roleConfig.delete({ where: { id: roleId } })
        ])

        await ctx.prisma.auditLog.create({
          data: {
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'ROLE_DELETED',
            targetId: roleId,
            targetType: 'ROLE',
            details: JSON.stringify({ roleName: role.role, level: role.level }),
          }
        })

        return { success: true, deletedRole: role.role }
      },
      {
        minRoleLevel: 1,
        requiredPermissions: [PERMISSIONS['role:delete']],
        auditLog: true,
      }
    )
  }
}
