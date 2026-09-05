// lib/admin/roles/role.repository.ts
// ============================================================
// Accès données Prisma (unique point de lecture/écriture DB
// pour le module rôles). Aucune logique métier ni autorisation
// ici — la policy et les services s'en chargent.
// ============================================================

import type {
  RoleConfig,
  RoleAssignment,
  Permission,
  AuditLog,
  AuditApprovalRequest,
  Prisma,
} from '@prisma/client';

import { prisma } from '@/server/core/secure-prisma';

const roleInclude = {
  rolePermissions: { select: { permissionId: true } },
  parent: { select: { id: true, role: true } },
  _count: { select: { roleAssignments: true } },
} satisfies Prisma.RoleConfigInclude;

export type RoleConfigRow = Prisma.RoleConfigGetPayload<{ include: typeof roleInclude }>;

export type AssignmentRow = Prisma.RoleAssignmentGetPayload<{
  include: {
    user: { select: { id: true; name: true; email: true; status: true } };
    roleConfig: true;
    permissionOverrides: {
      include: { permission: { select: { id: true; code: true; name: true } } };
      orderBy: { grantedAt: 'desc' };
    };
  };
}>;

export type AuditLogRow = Prisma.AuditLogGetPayload<{
  include: { user: { select: { id: true; name: true; email: true } } };
}>;

const assignmentInclude = {
  user: { select: { id: true, name: true, email: true, status: true } },
  roleConfig: true,
  permissionOverrides: {
    include: { permission: { select: { id: true, code: true, name: true } } },
    orderBy: { grantedAt: 'desc' as const },
  },
} satisfies Prisma.RoleAssignmentInclude;

export const RoleRepository = {
  /* ── Rôles ─────────────────────────────────────────── */

  listRoles(): Promise<RoleConfigRow[]> {
    return prisma.roleConfig.findMany({ include: roleInclude, orderBy: { level: 'asc' } });
  },

  findRoleById(id: string): Promise<RoleConfig | null> {
    return prisma.roleConfig.findUnique({ where: { id } });
  },

  findRoleWithRelations(id: string): Promise<RoleConfigRow | null> {
    return prisma.roleConfig.findUnique({ where: { id }, include: roleInclude });
  },

  createRole(data: Prisma.RoleConfigCreateInput): Promise<RoleConfig> {
    return prisma.roleConfig.create({ data });
  },

  updateRole(id: string, data: Prisma.RoleConfigUpdateInput): Promise<RoleConfig> {
    return prisma.roleConfig.update({ where: { id }, data });
  },

  /* ── Permissions ───────────────────────────────────── */

  listPermissions(): Promise<Permission[]> {
    return prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });
  },

  findPermissionsByIds(ids: string[]): Promise<Permission[]> {
    return prisma.permission.findMany({ where: { id: { in: ids } } });
  },

  listRolePermissionIds(roleId: string): Promise<string[]> {
    return prisma.rolePermission
      .findMany({ where: { roleconfigId: roleId }, select: { permissionId: true } })
      .then((rows) => rows.map((r) => r.permissionId));
  },

  replaceRolePermissions(roleId: string, permissionIds: string[]): Promise<unknown> {
    return prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleconfigId: roleId } });
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleconfigId: roleId, permissionId })),
        });
      }
    });
  },

  /* ── Assignments & overrides ───────────────────────── */

  listAssignmentsByRole(roleId: string): Promise<AssignmentRow[]> {
    return prisma.roleAssignment.findMany({
      where: { roleId },
      orderBy: { assignedAt: 'desc' },
      include: assignmentInclude,
    });
  },

  listAllAssignments(): Promise<AssignmentRow[]> {
    return prisma.roleAssignment.findMany({
      orderBy: { assignedAt: 'desc' },
      include: assignmentInclude,
    });
  },

  findAssignmentById(id: string): Promise<AssignmentRow | null> {
    return prisma.roleAssignment.findUnique({ where: { id }, include: assignmentInclude });
  },

  findAssignmentByUser(userId: string): Promise<RoleAssignment | null> {
    return prisma.roleAssignment.findUnique({ where: { userId } });
  },

  createAssignment(data: Prisma.RoleAssignmentUncheckedCreateInput): Promise<RoleAssignment> {
    return prisma.roleAssignment.create({ data });
  },

  deleteAssignment(id: string): Promise<RoleAssignment> {
    return prisma.roleAssignment.delete({ where: { id } });
  },

  updateAssignment(id: string, data: Prisma.RoleAssignmentUpdateInput): Promise<RoleAssignment> {
    return prisma.roleAssignment.update({ where: { id }, data });
  },

  upsertOverride(input: {
    roleAssignmentId: string;
    permissionId: string;
    isGranted: boolean;
    grantedBy: string;
    expiresAt: Date | null;
  }) {
    return prisma.permissionOverride.upsert({
      where: {
        roleAssignmentId_permissionId: {
          roleAssignmentId: input.roleAssignmentId,
          permissionId: input.permissionId,
        },
      },
      create: input,
      update: {
        isGranted: input.isGranted,
        expiresAt: input.expiresAt,
        grantedBy: input.grantedBy,
        grantedAt: new Date(),
      },
    });
  },

  /* ── Audit ─────────────────────────────────────────── */

  createAuditLog(data: Prisma.AuditLogUncheckedCreateInput): Promise<AuditLog> {
    return prisma.auditLog.create({ data });
  },

  listAuditLogs(filter: { action?: string; take: number }): Promise<AuditLogRow[]> {
    return prisma.auditLog.findMany({
      where: {
        OR: [
          { action: { startsWith: 'ROLE_' } },
          { action: { startsWith: 'PERMISSION_OVERRIDE_' } },
          ...(filter.action ? [{ action: filter.action }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: filter.take,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  },

  listApprovalRequests(): Promise<AuditApprovalRequest[]> {
    return prisma.auditApprovalRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  },
};
