import { PERMISSIONS } from '@/lib/auth/rbac';
import { roleRestrictionsSchema } from '@/lib/roles/role-schema';
import { assertRoleMutationAllowed } from '@/lib/roles/role.policy';
import { withSecurePrisma } from '@/server/core/secure-prisma';
import type { RoleRestrictions } from '@/lib/roles/role-schema';

export class RoleAdminServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'RoleAdminServiceError';
  }
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export const RoleAdminService = {
  async listRoles() {
    return withSecurePrisma(async (ctx) => {
      const roles = await ctx.prisma.roleConfig.findMany({
        include: {
          rolePermissions: { include: { permission: true } },
          _count: { select: { roleAssignments: true } },
        },
        orderBy: { level: 'asc' },
      });

      return roles.map((role) => ({
        id: role.id,
        name: role.role,
        level: role.level,
        description: role.description,
        isActive: role.isActive,
        isSystem: role.isSystem,
        isBlocked: Boolean(role.blockedAt),
        userCount: role._count.roleAssignments,
        restrictions: jsonObject(role.restrictions),
        permissions: role.rolePermissions.map(({ permission }) => ({
          id: permission.id,
          code: permission.code,
          name: permission.name,
          category: permission.category,
          isDangerous: permission.isDangerous,
        })),
      }));
    }, {
      minRoleLevel: 2,
      requiredPermissions: [PERMISSIONS['role:view']],
    });
  },

  async listPermissions() {
    return withSecurePrisma((ctx) => ctx.prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        category: true,
        isDangerous: true,
      },
    }), {
      minRoleLevel: 2,
      requiredPermissions: [PERMISSIONS['role:view']],
    });
  },

  async updatePermissions(roleId: string, permissionIds: string[]) {
    return withSecurePrisma(async (ctx) => {
      const role = await ctx.prisma.roleConfig.findUnique({ where: { id: roleId } });
      if (!role) throw new RoleAdminServiceError('Rôle introuvable', 'NOT_FOUND');

      try {
        assertRoleMutationAllowed(ctx, role, 'update');
      } catch (error) {
        throw new RoleAdminServiceError(error instanceof Error ? error.message : 'Rôle non modifiable', 'FORBIDDEN');
      }

      const permissions = await ctx.prisma.permission.findMany({
        where: { id: { in: permissionIds } },
        select: { id: true },
      });
      if (permissions.length !== new Set(permissionIds).size) {
        throw new RoleAdminServiceError('Une ou plusieurs permissions sont inconnues', 'UNKNOWN_PERMISSION');
      }

      await ctx.prisma.$transaction(async (tx) => {
        await tx.rolePermission.deleteMany({ where: { roleconfigId: roleId } });
        if (permissions.length) {
          await tx.rolePermission.createMany({
            data: permissions.map(({ id }) => ({ roleconfigId: roleId, permissionId: id })),
          });
        }
        await tx.auditLog.create({
          data: {
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'ROLE_PERMISSIONS_UPDATED',
            targetId: roleId,
            targetType: 'ROLE',
            details: JSON.stringify({ permissionIds }),
          },
        });
      });

      return { roleId };
    }, {
      minRoleLevel: 1,
      requiredPermissions: [PERMISSIONS['role:edit']],
    });
  },

  async updateRestrictions(roleId: string, input: unknown) {
    const parsed = roleRestrictionsSchema.safeParse(input);
    if (!parsed.success) throw new RoleAdminServiceError('Restrictions invalides', 'VALIDATION_ERROR');

    return withSecurePrisma(async (ctx) => {
      const role = await ctx.prisma.roleConfig.findUnique({ where: { id: roleId } });
      if (!role) throw new RoleAdminServiceError('Rôle introuvable', 'NOT_FOUND');
      try {
        assertRoleMutationAllowed(ctx, role, 'update');
      } catch (error) {
        throw new RoleAdminServiceError(error instanceof Error ? error.message : 'Rôle non modifiable', 'FORBIDDEN');
      }

      await ctx.prisma.$transaction([
        ctx.prisma.roleConfig.update({
          where: { id: roleId },
          data: { restrictions: parsed.data as RoleRestrictions },
        }),
        ctx.prisma.auditLog.create({
          data: {
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'ROLE_RESTRICTIONS_UPDATED',
            targetId: roleId,
            targetType: 'ROLE',
            details: JSON.stringify({ restrictions: parsed.data }),
          },
        }),
      ]);
      return { roleId };
    }, {
      minRoleLevel: 1,
      requiredPermissions: [PERMISSIONS['role:edit']],
    });
  },

  async listAssignments(roleId: string) {
    return withSecurePrisma(async (ctx) => ctx.prisma.roleAssignment.findMany({
      where: { roleId },
      orderBy: { assignedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
        permissionOverrides: {
          include: { permission: { select: { id: true, code: true, name: true } } },
          orderBy: { grantedAt: 'desc' },
        },
      },
    }), {
      minRoleLevel: 2,
      requiredPermissions: [PERMISSIONS['role:view']],
    });
  },

  async updateOverride(input: { roleAssignmentId: string; permissionId: string; isGranted: boolean; expiresAt?: Date | null }) {
    return withSecurePrisma(async (ctx) => {
      const assignment = await ctx.prisma.roleAssignment.findUnique({
        where: { id: input.roleAssignmentId },
        include: { roleConfig: true },
      });
      if (!assignment) throw new RoleAdminServiceError('Assignment introuvable', 'NOT_FOUND');
      try {
        assertRoleMutationAllowed(ctx, assignment.roleConfig, 'update');
      } catch (error) {
        throw new RoleAdminServiceError(error instanceof Error ? error.message : 'Assignment non modifiable', 'FORBIDDEN');
      }

      return ctx.prisma.$transaction(async (tx) => {
        const override = await tx.permissionOverride.upsert({
          where: {
            roleAssignmentId_permissionId: {
              roleAssignmentId: input.roleAssignmentId,
              permissionId: input.permissionId,
            },
          },
          create: { ...input, grantedBy: ctx.userId },
          update: { isGranted: input.isGranted, expiresAt: input.expiresAt, grantedBy: ctx.userId, grantedAt: new Date() },
        });
        await tx.auditLog.create({
          data: {
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'PERMISSION_OVERRIDE_UPDATED',
            targetId: assignment.userId,
            targetType: 'USER',
            details: JSON.stringify({ permissionId: input.permissionId, isGranted: input.isGranted }),
          },
        });
        return override;
      });
    }, {
      minRoleLevel: 1,
      requiredPermissions: [PERMISSIONS['permission:override']],
    });
  },

  async listAuditLogs() {
    return withSecurePrisma((ctx) => ctx.prisma.auditLog.findMany({
      where: {
        OR: [
          { targetType: { in: ['ROLE', 'USER'] }, action: { startsWith: 'ROLE_' } },
          { action: { startsWith: 'PERMISSION_OVERRIDE_' } },
          { action: { in: ['USER_BLOCKED', 'USER_UNBLOCKED'] } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        action: true,
        targetId: true,
        targetType: true,
        details: true,
        createdAt: true,
        roleLevel: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }), {
      minRoleLevel: 2,
      requiredPermissions: [PERMISSIONS['audit:view-logs']],
    });
  },
};