// lib/admin/roles/audit.service.ts
// ============================================================
// Module "Role Audit" : assignments, permission overrides,
// logs d'audit (ROLE_*, PERMISSION_OVERRIDE_*) et demandes
// d'approbation d'audit.
// ============================================================

import { PERMISSIONS } from '@/lib/auth/rbac';
import { withSecurePrisma } from '@/server/core/secure-prisma';
import {
  assignRoleSchema,
  revokeRoleSchema,
  assignmentBlockSchema,
  updatePermissionOverrideSchema,
  auditLogFilterSchema,
  roleIdSchema,
} from './role.schemas';
import { RoleRepository } from './role.repository';
import { assertRoleOperationAllowed, RolePolicyError } from './role.policy';
import { mapAssignment, mapAuditLog, mapApprovalRequest } from './role.mapper';
import type {
  AssignmentDto,
  OverrideDto,
  AuditLogDto,
  AuditApprovalRequestDto,
  ActionResult,
} from './role.types';

export class AuditServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AuditServiceError';
  }
}

function toFailure(error: unknown): ActionResult<never> {
  const code =
    error instanceof AuditServiceError || error instanceof RolePolicyError
      ? error.code
      : 'INTERNAL_ERROR';
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Erreur serveur inattendue',
    code,
  };
}

export const AuditService = {
  /* ── Lectures ─────────────────────────────────────── */

  /** Tous les assignments (avec utilisateur, rôle et overrides). */
  async listAssignments(roleIdRaw?: string): Promise<ActionResult<AssignmentDto[]>> {
    try {
      const roleId = roleIdRaw ? roleIdSchema.parse(roleIdRaw) : undefined;
      const rows = await withSecurePrisma(
        () =>
          roleId
            ? RoleRepository.listAssignmentsByRole(roleId)
            : RoleRepository.listAllAssignments(),
        { minRoleLevel: 2, requiredPermissions: [PERMISSIONS['role:view']] },
      );
      return { success: true, data: rows.map(mapAssignment) };
    } catch (error) {
      return toFailure(error);
    }
  },

  /** Logs d'audit liés aux rôles (ROLE_*, PERMISSION_OVERRIDE_*). */
  async listAuditLogs(
    filterRaw?: { roleId?: string; action?: string; take?: number },
  ): Promise<ActionResult<AuditLogDto[]>> {
    try {
      const filter = auditLogFilterSchema.parse(filterRaw ?? {});
      const logs = await withSecurePrisma(
        () => RoleRepository.listAuditLogs(filter),
        { minRoleLevel: 2, requiredPermissions: [PERMISSIONS['audit:view-logs']] },
      );
      let data = logs.map(mapAuditLog);
      if (filter.roleId) data = data.filter((log) => log.targetId === filter.roleId);
      return { success: true, data };
    } catch (error) {
      return toFailure(error);
    }
  },

  /** Demandes d'approbation d'audit (AuditApprovalRequest). */
  async listApprovalRequests(): Promise<ActionResult<AuditApprovalRequestDto[]>> {
    try {
      const requests = await withSecurePrisma(
        () => RoleRepository.listApprovalRequests(),
        { minRoleLevel: 2, requiredPermissions: [PERMISSIONS['audit:view-logs']] },
      );
      return { success: true, data: requests.map(mapApprovalRequest) };
    } catch (error) {
      return toFailure(error);
    }
  },

  /* ── Assignations ─────────────────────────────────── */

  /** Assigne un rôle à un utilisateur (ROLE_ASSIGNED). */
  async assignRole(input: unknown): Promise<ActionResult<AssignmentDto>> {
    try {
      const parsed = assignRoleSchema.parse(input);
      const assignment = await withSecurePrisma(
        async (ctx) => {
          const role = await RoleRepository.findRoleById(parsed.roleId);
          if (!role) throw new AuditServiceError('Rôle introuvable', 'NOT_FOUND');
          if (!role.isActive) {
            throw new AuditServiceError('Le rôle est désactivé', 'ROLE_INACTIVE');
          }
          assertRoleOperationAllowed(ctx, role, 'assign');
          const existing = await RoleRepository.findAssignmentByUser(parsed.userId);
          if (existing) {
            throw new AuditServiceError(
              'Cet utilisateur possède déjà un rôle (un seul rôle par utilisateur)',
              'ALREADY_ASSIGNED',
            );
          }
          const created = await RoleRepository.createAssignment({
            userId: parsed.userId,
            roleId: parsed.roleId,
            assignedBy: ctx.userId,
          });
          await RoleRepository.createAuditLog({
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'ROLE_ASSIGNED',
            targetId: parsed.userId,
            targetType: 'USER',
            details: JSON.stringify({ roleId: parsed.roleId, role: role.role }),
          });
          return created;
        },
        { minRoleLevel: 1, requiredPermissions: [PERMISSIONS['role:assign']] },
      );
      const full = await RoleRepository.findAssignmentById(assignment.id);
      if (!full) throw new AuditServiceError('Assignment introuvable', 'NOT_FOUND');
      return { success: true, data: mapAssignment(full), message: 'Rôle assigné' };
    } catch (error) {
      return toFailure(error);
    }
  },

  /** Révoque un assignment (ROLE_REVOKED). */
  async revokeRole(assignmentIdRaw: string): Promise<ActionResult<{ id: string }>> {
    try {
      const { assignmentId } = revokeRoleSchema.parse({ assignmentId: assignmentIdRaw });
      await withSecurePrisma(
        async (ctx) => {
          const assignment = await RoleRepository.findAssignmentById(assignmentId);
          if (!assignment) throw new AuditServiceError('Assignment introuvable', 'NOT_FOUND');
          assertRoleOperationAllowed(ctx, assignment.roleConfig, 'revoke');
          await RoleRepository.deleteAssignment(assignmentId);
          await RoleRepository.createAuditLog({
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'ROLE_REVOKED',
            targetId: assignment.user.id,
            targetType: 'USER',
            details: JSON.stringify({ roleId: assignment.roleConfig.id }),
          });
        },
        { minRoleLevel: 1, requiredPermissions: [PERMISSIONS['role:assign']] },
      );
      return { success: true, data: { id: assignmentId }, message: 'Rôle révoqué' };
    } catch (error) {
      return toFailure(error);
    }
  },

  /** Blocage / déblocage d'un assignment. */
  async setAssignmentBlocked(
    assignmentIdRaw: string,
    blocked: boolean,
    reason?: string,
    blockedUntil?: string | null,
  ): Promise<ActionResult<AssignmentDto>> {
    try {
      const parsedBlock = assignmentBlockSchema.parse({
        assignmentId: assignmentIdRaw,
        reason,
        blockedUntil: blockedUntil ?? undefined,
      });
      await withSecurePrisma(
        async (ctx) => {
          const assignment = await RoleRepository.findAssignmentById(parsedBlock.assignmentId);
          if (!assignment) throw new AuditServiceError('Assignment introuvable', 'NOT_FOUND');
          assertRoleOperationAllowed(
            ctx,
            assignment.roleConfig,
            blocked ? 'block' : 'unblock',
          );
          await RoleRepository.updateAssignment(
            parsedBlock.assignmentId,
            blocked
              ? {
                  isBlocked: true,
                  blockedAt: new Date(),
                  blockedReason: parsedBlock.reason ?? null,
                  blockedUntil: parsedBlock.blockedUntil
                    ? new Date(parsedBlock.blockedUntil)
                    : null,
                }
              : { isBlocked: false, blockedAt: null, blockedReason: null, blockedUntil: null },
          );
          await RoleRepository.createAuditLog({
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: blocked ? 'ROLE_BLOCKED' : 'ROLE_UNBLOCKED',
            targetId: assignment.user.id,
            targetType: 'USER',
            details: JSON.stringify({ assignmentId: parsedBlock.assignmentId, reason: parsedBlock.reason ?? null }),
          });
        },
        { minRoleLevel: 1, requiredPermissions: [PERMISSIONS['role:edit']] },
      );
      const full = await RoleRepository.findAssignmentById(parsedBlock.assignmentId);
      if (!full) throw new AuditServiceError('Assignment introuvable', 'NOT_FOUND');
      return {
        success: true,
        data: mapAssignment(full),
        message: blocked ? 'Assignment bloqué' : 'Assignment débloqué',
      };
    } catch (error) {
      return toFailure(error);
    }
  },

  /** Upsert d'un override de permission (ON/OFF + expiration). */
  async updateOverride(input: unknown): Promise<ActionResult<OverrideDto>> {
    try {
      const parsed = updatePermissionOverrideSchema.parse(input);
      const override = await withSecurePrisma(
        async (ctx) => {
          const assignment = await RoleRepository.findAssignmentById(parsed.assignmentId);
          if (!assignment) throw new AuditServiceError('Assignment introuvable', 'NOT_FOUND');
          assertRoleOperationAllowed(ctx, assignment.roleConfig, 'override');
          const permissionExists = await RoleRepository.findPermissionsByIds([parsed.permissionId]);
          if (permissionExists.length === 0) {
            throw new AuditServiceError('Permission inconnue', 'UNKNOWN_PERMISSION');
          }
          const result = await RoleRepository.upsertOverride({
            roleAssignmentId: parsed.assignmentId,
            permissionId: parsed.permissionId,
            isGranted: parsed.isGranted,
            grantedBy: ctx.userId,
            expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
          });
          await RoleRepository.createAuditLog({
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'PERMISSION_OVERRIDE_UPDATED',
            targetId: parsed.assignmentId,
            targetType: 'USER',
            details: JSON.stringify({
              permissionId: parsed.permissionId,
              isGranted: parsed.isGranted,
            }),
          });
          return result;
        },
        { minRoleLevel: 1, requiredPermissions: [PERMISSIONS['permission:override']] },
      );
      const full = await RoleRepository.findAssignmentById(parsed.assignmentId);
      const mapped = full?.permissionOverrides.find((o) => o.id === override.id);
      return {
        success: true,
        data: mapped
          ? {
              id: mapped.id,
              assignmentId: full!.id,
              userId: full!.user.id,
              permissionId: mapped.permission.id,
              permissionCode: mapped.permission.code as OverrideDto['permissionCode'],
              permissionName: mapped.permission.name,
              isGranted: mapped.isGranted,
              grantedBy: mapped.grantedBy,
              grantedByRoleName: null,
              grantedAt: mapped.grantedAt.toISOString(),
              expiresAt: mapped.expiresAt ? mapped.expiresAt.toISOString() : null,
            }
          : ({
              id: override.id,
              assignmentId: override.roleAssignmentId,
              userId: '',
              permissionId: override.permissionId,
              permissionCode: '',
              permissionName: '',
              isGranted: override.isGranted,
              grantedBy: override.grantedBy,
              grantedByRoleName: null,
              grantedAt: override.grantedAt.toISOString(),
              expiresAt: override.expiresAt ? override.expiresAt.toISOString() : null,
            } as unknown as OverrideDto),
        message: `Override ${parsed.isGranted ? 'ON' : 'OFF'} enregistré`,
      };
    } catch (error) {
      return toFailure(error);
    }
  },
};
