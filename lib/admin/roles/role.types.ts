// lib/admin/roles/role.types.ts
// ============================================================
// Types métier de la gestion des rôles (DTO sérialisables).
// ============================================================

import type { Role as PrismaRole } from '@prisma/client';
import type { PermissionCode, Restriction, ToggleState } from '@/lib/auth/rbac';

/** Rôle logique (7 rôles du RBAC). */
export type RoleName = PrismaRole;

export type RoleDto = {
  id: string;
  name: RoleName;
  level: number;
  description: string;
  isActive: boolean;
  isSystem: boolean;
  isBlocked: boolean;
  blockedAt: string | null;
  blockedReason: string | null;
  parentId: string | null;
  parentName: RoleName | null;
  userCount: number;
  permissionCount: number;
  restrictions: Partial<Record<Restriction, string | ToggleState>>;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type PermissionDto = {
  id: string;
  code: PermissionCode;
  name: string;
  description: string | null;
  category: string;
  isDangerous: boolean;
};

/** Entrée de la matrice rôle × permission. */
export type RolePermissionMatrixRow = {
  roleId: string;
  roleName: RoleName;
  level: number;
  permissionIds: string[];
  isBlocked: boolean;
  isActive: boolean;
};

/** Permissions effectives : rôle + héritage parent + overrides DB. */
export type EffectivePermissions = {
  roleId: string;
  roleName: RoleName;
  own: PermissionCode[];
  inherited: PermissionCode[];
  effective: PermissionCode[];
  missingMandatory: PermissionCode[];
};

export type AssignmentDto = {
  id: string;
  roleId: string;
  roleName: RoleName;
  userId: string;
  userName: string | null;
  userEmail: string;
  userStatus: string;
  assignedBy: string | null;
  assignedByRoleName: string | null;
  assignedAt: string;
  lastVerifiedAt: string;
  isBlocked: boolean;
  blockedReason: string | null;
  blockedAt: string | null;
  blockedUntil: string | null;
  overrides: OverrideDto[];
};

export type OverrideDto = {
  id: string;
  assignmentId: string;
  userId: string;
  permissionId: string;
  permissionCode: PermissionCode;
  permissionName: string;
  isGranted: boolean;
  grantedBy: string | null;
  grantedByRoleName: string | null;
  grantedAt: string;
  expiresAt: string | null;
};

export type AuditLogDto = {
  id: string;
  action: string;
  userId: string;
  actorName: string | null;
  actorEmail: string | null;
  targetId: string | null;
  targetType: string | null;
  details: string | null;
  roleLevel: number;
  createdAt: string;
};

export type AuditApprovalRequestDto = {
  id: string;
  requesterId: string;
  requesterRole: string;
  requesterLevel: number;
  targetRole: string;
  targetLevel: number;
  reason: string;
  status: string;
  approvedById: string | null;
  expiresAt: string;
  createdAt: string;
};

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | {
      success: false;
      error: string;
      code: string;
      fieldErrors?: Record<string, string[]>;
    };
