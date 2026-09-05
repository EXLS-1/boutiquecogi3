// lib/admin/roles/role.service.ts
// ============================================================
// Service orchestrateur du module "Role Configuration".
// Autorisation via withSecurePrisma, policy, validation Zod,
// mapping DTO et traçabilité audit systématique.
// ============================================================

import { PERMISSIONS } from '@/lib/auth/rbac';
import { withSecurePrisma } from '@/server/core/secure-prisma';
import { createRoleSchema, updateRoleSchema, roleIdSchema } from './role.schemas';
import { RoleRepository } from './role.repository';
import { assertRoleOperationAllowed, RolePolicyError } from './role.policy';
import { mapRole, mapPermission } from './role.mapper';
import type { RoleDto, PermissionDto, ActionResult } from './role.types';

export class RoleServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'RoleServiceError';
  }
}

function toFailure(error: unknown): ActionResult<never> {
  const code = error instanceof RoleServiceError || error instanceof RolePolicyError
    ? error.code
    : error instanceof Error && 'code' in error
      ? String((error as { code?: unknown }).code)
      : 'INTERNAL_ERROR';
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Erreur serveur inattendue',
    code,
  };
}

export const RoleService = {
  /** Liste des 7 rôles avec niveaux, hiérarchie, statut, compteurs. */
  async listRoles(): Promise<ActionResult<RoleDto[]>> {
    try {
      const roles = await withSecurePrisma(
        () => RoleRepository.listRoles(),
        { minRoleLevel: 2, requiredPermissions: [PERMISSIONS['role:view']] },
      );
      return { success: true, data: roles.map(mapRole) };
    } catch (error) {
      return toFailure(error);
    }
  },

  /** Détail d'un rôle (configuration complète). */
  async getRole(roleIdRaw: string): Promise<ActionResult<RoleDto>> {
    try {
      const roleId = roleIdSchema.parse(roleIdRaw);
      const row = await withSecurePrisma(
        async () => {
          const found = await RoleRepository.findRoleWithRelations(roleId);
          if (!found) throw new RoleServiceError('Rôle introuvable', 'NOT_FOUND');
          return found;
        },
        { minRoleLevel: 2, requiredPermissions: [PERMISSIONS['role:view']] },
      );
      return { success: true, data: mapRole(row) };
    } catch (error) {
      return toFailure(error);
    }
  },

  /** Catalogue des permissions (avec catégories & flag danger). */
  async listPermissions(): Promise<ActionResult<PermissionDto[]>> {
    try {
      const permissions = await withSecurePrisma(
        () => RoleRepository.listPermissions(),
        { minRoleLevel: 2, requiredPermissions: [PERMISSIONS['role:view']] },
      );
      return { success: true, data: permissions.map(mapPermission) };
    } catch (error) {
      return toFailure(error);
    }
  },

  /** Création d'un rôle (niveaux 2-6 uniquement). */
  async createRole(input: unknown): Promise<ActionResult<RoleDto>> {
    try {
      const parsed = createRoleSchema.parse(input);
      const role = await withSecurePrisma(
        async (ctx) => {
          if (ctx.roleLevel >= parsed.level) {
            throw new RolePolicyError(
              'Vous ne pouvez pas créer un rôle de niveau égal ou supérieur au vôtre',
              'HIERARCHY_DENIED',
            );
          }
          const permissions = await RoleRepository.findPermissionsByIds(parsed.permissionIds);
          if (permissions.length !== new Set(parsed.permissionIds).size) {
            throw new RoleServiceError('Permission inconnue', 'UNKNOWN_PERMISSION');
          }
          const created = await RoleRepository.createRole({
            role: parsed.name as never,
            level: parsed.level,
            description: parsed.description,
            isActive: parsed.isActive,
            createdBy: ctx.userId,
            updatedBy: ctx.userId,
            rolePermissions: {
              create: permissions.map(({ id }) => ({ permissionId: id })),
            },
          });
          await RoleRepository.createAuditLog({
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'ROLE_CREATED',
            targetId: created.id,
            targetType: 'ROLE',
            details: JSON.stringify({ name: parsed.name, level: parsed.level }),
          });
          const full = await RoleRepository.findRoleWithRelations(created.id);
          if (!full) throw new RoleServiceError('Rôle introuvable', 'NOT_FOUND');
          return full;
        },
        { minRoleLevel: 1, requiredPermissions: [PERMISSIONS['role:create']] },
      );
      return { success: true, data: mapRole(role), message: `Rôle « ${parsed.name} » créé` };
    } catch (error) {
      return toFailure(error);
    }
  },

  /** Mise à jour (description, activation). */
  async updateRole(roleIdRaw: string, input: unknown): Promise<ActionResult<RoleDto>> {
    try {
      const roleId = roleIdSchema.parse(roleIdRaw);
      const parsed = updateRoleSchema.parse(input);
      await withSecurePrisma(
        async (ctx) => {
          const existing = await RoleRepository.findRoleById(roleId);
          if (!existing) throw new RoleServiceError('Rôle introuvable', 'NOT_FOUND');
          assertRoleOperationAllowed(ctx, existing, 'update');
          await RoleRepository.updateRole(roleId, {
            ...(parsed.description !== undefined ? { description: parsed.description } : {}),
            ...(parsed.isActive !== undefined ? { isActive: parsed.isActive } : {}),
            updatedBy: ctx.userId,
          });
          await RoleRepository.createAuditLog({
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'ROLE_UPDATED',
            targetId: roleId,
            targetType: 'ROLE',
            details: JSON.stringify(parsed),
          });
        },
        { minRoleLevel: 1, requiredPermissions: [PERMISSIONS['role:edit']] },
      );
      return this.getRole(roleId);
    } catch (error) {
      return toFailure(error);
    }
  },

  /** Activation / désactivation. */
  async setActiveRole(roleIdRaw: string, isActive: boolean): Promise<ActionResult<RoleDto>> {
    try {
      const roleId = roleIdSchema.parse(roleIdRaw);
      await withSecurePrisma(
        async (ctx) => {
          const existing = await RoleRepository.findRoleById(roleId);
          if (!existing) throw new RoleServiceError('Rôle introuvable', 'NOT_FOUND');
          assertRoleOperationAllowed(ctx, existing, isActive ? 'activate' : 'deactivate');
          await RoleRepository.updateRole(roleId, { isActive, updatedBy: ctx.userId });
          await RoleRepository.createAuditLog({
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: isActive ? 'ROLE_ACTIVATED' : 'ROLE_DEACTIVATED',
            targetId: roleId,
            targetType: 'ROLE',
          });
        },
        { minRoleLevel: 1, requiredPermissions: [PERMISSIONS['role:edit']] },
      );
      return this.getRole(roleId);
    } catch (error) {
      return toFailure(error);
    }
  },

  /** Blocage / déblocage d'un rôle. */
  async setBlockedRole(
    roleIdRaw: string,
    blocked: boolean,
    reason?: string,
  ): Promise<ActionResult<RoleDto>> {
    try {
      const roleId = roleIdSchema.parse(roleIdRaw);
      await withSecurePrisma(
        async (ctx) => {
          const existing = await RoleRepository.findRoleById(roleId);
          if (!existing) throw new RoleServiceError('Rôle introuvable', 'NOT_FOUND');
          assertRoleOperationAllowed(ctx, existing, blocked ? 'block' : 'unblock');
          const now = new Date();
          await RoleRepository.updateRole(
            roleId,
            blocked
              ? { blockedAt: now, blockedReason: reason ?? null, blockedBy: ctx.userId }
              : {
                  unblockedAt: now,
                  unblockedBy: ctx.userId,
                  unblockedReason: reason ?? null,
                  blockedAt: null,
                  blockedReason: null,
                },
          );
          await RoleRepository.createAuditLog({
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: blocked ? 'ROLE_BLOCKED' : 'ROLE_UNBLOCKED',
            targetId: roleId,
            targetType: 'ROLE',
            details: JSON.stringify({ reason: reason ?? null }),
          });
        },
        { minRoleLevel: 1, requiredPermissions: [PERMISSIONS['role:edit']] },
      );
      return this.getRole(roleId);
    } catch (error) {
      return toFailure(error);
    }
  },
};
