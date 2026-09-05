// lib/admin/roles/permission.service.ts
// ============================================================
// Module "Role Permissions" : catalogue, matrice rôle ×
// permission, permissions obligatoires, héritées et effectives.
// ============================================================

import { PERMISSIONS } from '@/lib/auth/rbac';
import { withSecurePrisma } from '@/server/core/secure-prisma';
import { roleIdSchema, updateRolePermissionsSchema } from './role.schemas';
import { RoleRepository } from './role.repository';
import { assertRoleOperationAllowed, RolePolicyError } from './role.policy';
import { mapPermission } from './role.mapper';
import { MANDATORY_PERMISSIONS_BY_LEVEL } from './role.constants';
import type {
  PermissionDto,
  RolePermissionMatrixRow,
  EffectivePermissions,
  ActionResult,
} from './role.types';

export class PermissionServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'PermissionServiceError';
  }
}

function toFailure(error: unknown): ActionResult<never> {
  const code =
    error instanceof PermissionServiceError || error instanceof RolePolicyError
      ? error.code
      : 'INTERNAL_ERROR';
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Erreur serveur inattendue',
    code,
  };
}

export const PermissionService = {
  /** Catalogue complet des permissions. */
  async listCatalog(): Promise<ActionResult<PermissionDto[]>> {
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

  /** Matrice complète rôle × permission. */
  async listMatrix(): Promise<ActionResult<RolePermissionMatrixRow[]>> {
    try {
      const roles = await withSecurePrisma(
        () => RoleRepository.listRoles(),
        { minRoleLevel: 2, requiredPermissions: [PERMISSIONS['role:view']] },
      );
      return {
        success: true,
        data: roles.map((row) => ({
          roleId: row.id,
          roleName: row.role,
          level: row.level,
          permissionIds: row.rolePermissions.map((rp) => rp.permissionId),
          isBlocked: Boolean(row.blockedAt),
          isActive: row.isActive,
        })),
      };
    } catch (error) {
      return toFailure(error);
    }
  },

  /** Permissions obligatoires, héritées et effectives d'un rôle. */
  async listEffective(roleIdRaw: string): Promise<ActionResult<EffectivePermissions>> {
    try {
      const roleId = roleIdSchema.parse(roleIdRaw);
      const result = await withSecurePrisma(
        async () => {
          const row = await RoleRepository.findRoleWithRelations(roleId);
          if (!row) throw new PermissionServiceError('Rôle introuvable', 'NOT_FOUND');

          // Remonter la hiérarchie (parentId → parent), 7 niveaux max.
          const ownIds = row.rolePermissions.map((rp) => rp.permissionId);
          const inheritedIds: string[] = [];
          let cursor = row.parentId;
          let guard = 0;
          while (cursor && guard < 7) {
            inheritedIds.push(...(await RoleRepository.listRolePermissionIds(cursor)));
            const parent = await RoleRepository.findRoleById(cursor);
            cursor = parent?.parentId ?? null;
            guard += 1;
          }

          const allPermissions = await RoleRepository.listPermissions();
          const codeById = new Map(allPermissions.map((p) => [p.id, p.code]));
          const own = ownIds.map((id) => codeById.get(id)).filter((c): c is string => Boolean(c));
          const ownSet = new Set(own);
          const inherited = inheritedIds
            .map((id) => codeById.get(id))
            .filter((c): c is string => Boolean(c) && !ownSet.has(c as string));
          const effective = Array.from(new Set([...own, ...inherited]));
          const mandatory = MANDATORY_PERMISSIONS_BY_LEVEL[row.level] ?? [];
          const missingMandatory = mandatory.filter((code) => !effective.includes(code));

          return { roleId: row.id, roleName: row.role, own, inherited, effective, missingMandatory };
        },
        { minRoleLevel: 2, requiredPermissions: [PERMISSIONS['role:view']] },
      );
      return { success: true, data: result as EffectivePermissions };
    } catch (error) {
      return toFailure(error);
    }
  },

  /** Mise à jour de la matrice d'un rôle (avec garde-fou + audit). */
  async updatePermissions(
    roleIdRaw: string,
    permissionIdsRaw: string[],
  ): Promise<ActionResult<{ roleId: string }>> {
    try {
      const { roleId, permissionIds } = updateRolePermissionsSchema.parse({
        roleId: roleIdRaw,
        permissionIds: permissionIdsRaw,
      });
      await withSecurePrisma(
        async (ctx) => {
          const existing = await RoleRepository.findRoleById(roleId);
          if (!existing) throw new PermissionServiceError('Rôle introuvable', 'NOT_FOUND');
          assertRoleOperationAllowed(ctx, existing, 'permissions');
          const permissions = await RoleRepository.findPermissionsByIds(permissionIds);
          if (permissions.length !== new Set(permissionIds).size) {
            throw new PermissionServiceError(
              'Une ou plusieurs permissions sont inconnues',
              'UNKNOWN_PERMISSION',
            );
          }
          const mandatory = MANDATORY_PERMISSIONS_BY_LEVEL[existing.level] ?? [];
          const grantedCodes = permissions.map((p) => p.code);
          const missingMandatory = mandatory.filter((code) => !grantedCodes.includes(code));
          if (missingMandatory.length > 0) {
            throw new PermissionServiceError(
              `Permissions obligatoires manquantes : ${missingMandatory.join(', ')}`,
              'MANDATORY_PERMISSION_MISSING',
            );
          }
          await RoleRepository.replaceRolePermissions(roleId, permissionIds);
          await RoleRepository.createAuditLog({
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'ROLE_PERMISSION_CHANGED',
            targetId: roleId,
            targetType: 'ROLE',
            details: JSON.stringify({ count: permissionIds.length }),
          });
        },
        { minRoleLevel: 1, requiredPermissions: [PERMISSIONS['role:edit']] },
      );
      return { success: true, data: { roleId }, message: 'Permissions mises à jour' };
    } catch (error) {
      return toFailure(error);
    }
  },

  /** Réinitialisation : suppression des permissions explicites. */
  async resetPermissions(roleIdRaw: string): Promise<ActionResult<{ roleId: string }>> {
    try {
      const roleId = roleIdSchema.parse(roleIdRaw);
      await withSecurePrisma(
        async (ctx) => {
          const existing = await RoleRepository.findRoleById(roleId);
          if (!existing) throw new PermissionServiceError('Rôle introuvable', 'NOT_FOUND');
          assertRoleOperationAllowed(ctx, existing, 'permissions');
          await RoleRepository.replaceRolePermissions(roleId, []);
          await RoleRepository.createAuditLog({
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'ROLE_PERMISSIONS_RESET',
            targetId: roleId,
            targetType: 'ROLE',
          });
        },
        { minRoleLevel: 1, requiredPermissions: [PERMISSIONS['role:edit']] },
      );
      return { success: true, data: { roleId }, message: 'Permissions réinitialisées' };
    } catch (error) {
      return toFailure(error);
    }
  },
};
