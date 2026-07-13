// server/services/role-service.ts

import { withSecurePrisma } from '@/server/core/secure-prisma'
import { createRoleSchema, type CreateRoleInput } from '@/lib/validations/role'
import { PERMISSIONS, ROLE_HIERARCHY, ROLES } from '@/lib/auth/rbac'

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
        // 1. Vérifier si le nom existe déjà
        const existing = await ctx.prisma.role.findUnique({
          where: { name: parsed.data.name }
        })

        if (existing) {
          throw new RoleServiceError(
            `Le rôle "${parsed.data.name}" existe déjà`,
            'DUPLICATE_NAME'
          )
        }

        // 2. Vérifier si le niveau existe déjà
        const existingLevel = await ctx.prisma.role.findUnique({
          where: { level: parsed.data.level }
        })

        if (existingLevel) {
          throw new RoleServiceError(
            `Le niveau ${parsed.data.level} est déjà attribué au rôle "${existingLevel.name}"`,
            'DUPLICATE_LEVEL'
          )
        }

        // 3. Vérifier que les permissions demandées existent
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

        // ─── Création atomique ───
        const role = await ctx.prisma.role.create({
          data: {
            name: parsed.data.name,
            level: parsed.data.level,
            description: parsed.data.description,
            isActive: parsed.data.isActive,
            defaultPermissions: {
              create: permissions.map(p => ({
                permissionId: p.id
              }))
            }
          },
          include: {
            defaultPermissions: {
              include: { permission: true }
            }
          }
        })

        // ─── Audit log ───
        await ctx.prisma.auditLog.create({
          data: {
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'ROLE_CREATED',
            targetId: role.id,
            targetType: 'ROLE',
            details: JSON.stringify({
              roleName: role.name,
              level: role.level,
              permissions: parsed.data.defaultPermissionCodes,
              createdBy: ctx.userId,
            }),
          }
        })

        return {
          id: role.id,
          name: role.name,
          level: role.level,
          description: role.description,
          isActive: role.isActive,
          permissions: role.defaultPermissions.map(dp => dp.permission.code),
          createdAt: role.createdAt,
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
        const roles = await ctx.prisma.role.findMany({
          include: {
            defaultPermissions: {
              include: { permission: { select: { code: true, name: true } } }
            },
            _count: { select: { assignments: true } }
          },
          orderBy: { level: 'asc' }
        })

        return roles.map(role => ({
          id: role.id,
          name: role.name,
          level: role.level,
          description: role.description,
          isActive: role.isActive,
          userCount: role._count.assignments,
          permissions: role.defaultPermissions.map(dp => ({
            code: dp.permission.code,
            name: dp.permission.name,
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
    data: Partial<Pick<CreateRoleInput, 'description' | 'isActive' | 'defaultPermissionCodes'>>
  ) {
    return withSecurePrisma(
      async (ctx) => {
        const role = await ctx.prisma.role.findUnique({
          where: { id: roleId },
          include: { defaultPermissions: true }
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

        let permissionConnections = undefined
        if (data.defaultPermissionCodes) {
          const permissions = await ctx.prisma.permission.findMany({
            where: { code: { in: data.defaultPermissionCodes } }
          })

          permissionConnections = {
            deleteMany: {},
            create: permissions.map(p => ({ permissionId: p.id }))
          }
        }

        const updated = await ctx.prisma.role.update({
          where: { id: roleId },
          data: {
            description: data.description,
            isActive: data.isActive,
            ...(permissionConnections && { defaultPermissions: permissionConnections }),
          },
          include: {
            defaultPermissions: { include: { permission: true } }
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
        const role = await ctx.prisma.role.findUnique({
          where: { id: roleId },
          include: {
            assignments: { take: 1 },
            defaultPermissions: true
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

        if (role.assignments.length > 0) {
          throw new RoleServiceError(
            `Impossible de supprimer: ${role.assignments.length} utilisateur(s) assigné(s)`,
            'ROLE_IN_USE'
          )
        }

        await ctx.prisma.$transaction([
          ctx.prisma.roleDefaultPermission.deleteMany({ where: { roleId } }),
          ctx.prisma.role.delete({ where: { id: roleId } })
        ])

        await ctx.prisma.auditLog.create({
          data: {
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'ROLE_DELETED',
            targetId: roleId,
            targetType: 'ROLE',
            details: JSON.stringify({ roleName: role.name, level: role.level }),
          }
        })

        return { success: true, deletedRole: role.name }
      },
      {
        minRoleLevel: 1,
        requiredPermissions: [PERMISSIONS['role:delete']],
        auditLog: true,
      }
    )
  }
}
