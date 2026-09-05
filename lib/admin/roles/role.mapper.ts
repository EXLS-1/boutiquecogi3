// lib/admin/roles/role.mapper.ts
// ============================================================
// Mapping lignes Prisma → DTO sérialisables (Server → Client).
// ============================================================

import type { Restriction, ToggleState } from '@/lib/auth/rbac';

import type {
  RoleConfigRow,
  AssignmentRow,
  AuditLogRow,
} from './role.repository';
import type {
  RoleDto,
  PermissionDto,
  AssignmentDto,
  OverrideDto,
  AuditLogDto,
  AuditApprovalRequestDto,
} from './role.types';
import type { RoleName } from './role.types';

type PrismaPermission = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  isDangerous: boolean;
};

function iso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

function safeRestrictions(raw: unknown): RoleDto['restrictions'] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as RoleDto['restrictions'];
}

export function mapRole(row: RoleConfigRow): RoleDto {
  return {
    id: row.id,
    name: row.role as RoleName,
    level: row.level,
    description: row.description,
    isActive: row.isActive,
    isSystem: row.isSystem,
    isBlocked: Boolean(row.blockedAt),
    blockedAt: iso(row.blockedAt),
    blockedReason: row.blockedReason,
    parentId: row.parentId,
    parentName: (row.parent?.role as RoleName | undefined) ?? null,
    userCount: row._count.roleAssignments,
    permissionCount: row.rolePermissions.length,
    restrictions: safeRestrictions(row.restrictions),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
  };
}

export function mapPermission(permission: PrismaPermission): PermissionDto {
  return {
    id: permission.id,
    code: permission.code as PermissionDto['code'],
    name: permission.name,
    description: permission.description,
    category: permission.category,
    isDangerous: permission.isDangerous,
  };
}

function mapOverride(
  override: AssignmentRow['permissionOverrides'][number],
  assignment: { id: string; userId: string },
): OverrideDto {
  return {
    id: override.id,
    assignmentId: assignment.id,
    userId: assignment.userId,
    permissionId: override.permission.id,
    permissionCode: override.permission.code as OverrideDto['permissionCode'],
    permissionName: override.permission.name,
    isGranted: override.isGranted,
    grantedBy: override.grantedBy,
    grantedByRoleName: null,
    grantedAt: override.grantedAt.toISOString(),
    expiresAt: iso(override.expiresAt),
  };
}

export function mapAssignment(row: AssignmentRow): AssignmentDto {
  return {
    id: row.id,
    roleId: row.roleConfig.id,
    roleName: row.roleConfig.role as RoleName,
    userId: row.user.id,
    userName: row.user.name,
    userEmail: row.user.email,
    userStatus: row.user.status ?? 'UNKNOWN',
    assignedBy: row.assignedBy,
    assignedByRoleName: null,
    assignedAt: row.assignedAt.toISOString(),
    lastVerifiedAt: row.lastVerifiedAt.toISOString(),
    isBlocked: row.isBlocked,
    blockedReason: row.blockedReason,
    blockedAt: iso(row.blockedAt),
    blockedUntil: iso(row.blockedUntil),
    overrides: row.permissionOverrides.map((o) =>
      mapOverride(o, { id: row.id, userId: row.user.id }),
    ),
  };
}

export function mapAuditLog(row: AuditLogRow): AuditLogDto {
  return {
    id: row.id,
    action: row.action,
    userId: row.userId,
    actorName: row.user?.name ?? null,
    actorEmail: row.user?.email ?? null,
    targetId: row.targetId,
    targetType: row.targetType,
    details: row.details,
    roleLevel: row.roleLevel,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapApprovalRequest(
  row: Awaited<ReturnType<typeof import('./role.repository').RoleRepository.listApprovalRequests>>[number],
): AuditApprovalRequestDto {
  return {
    id: row.id,
    requesterId: row.requesterId,
    requesterRole: row.requesterRole,
    requesterLevel: row.requesterLevel,
    targetRole: row.targetRole,
    targetLevel: row.targetLevel,
    reason: row.reason,
    status: row.status,
    approvedById: row.approvedById,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export type { Restriction, ToggleState };
