// lib/admin/roles/restriction.service.ts
// ============================================================
// Module "Role Restrictions" : quotas, rate limit, API,
// webhooks, analytics, export, bulk actions, 2FA, session,
// approbation, niveaux d'audit. Validation Zod alignée sur le
// schéma du RBAC (roleRestrictionsSchema).
// ============================================================

import { PERMISSIONS } from '@/lib/auth/rbac';
import { withSecurePrisma } from '@/server/core/secure-prisma';
import { roleIdSchema, roleRestrictionsSchema } from './role.schemas';
import { RoleRepository } from './role.repository';
import { assertRoleOperationAllowed, RolePolicyError } from './role.policy';
import type { RoleRestrictionsInput, } from './role.schemas';
import type { ActionResult } from './role.types';

export class RestrictionServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'RestrictionServiceError';
  }
}

function toFailure(error: unknown): ActionResult<never> {
  const code =
    error instanceof RestrictionServiceError || error instanceof RolePolicyError
      ? error.code
      : 'INTERNAL_ERROR';
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Erreur serveur inattendue',
    code,
  };
}

export const RestrictionService = {
  /** Restrictions d'un rôle (objet JSON validé côté lecture). */
  async getRestrictions(roleIdRaw: string): Promise<ActionResult<RoleRestrictionsInput>> {
    try {
      const roleId = roleIdSchema.parse(roleIdRaw);
      const restrictions = await withSecurePrisma(
        async () => {
          const role = await RoleRepository.findRoleById(roleId);
          if (!role) throw new RestrictionServiceError('Rôle introuvable', 'NOT_FOUND');
          return roleRestrictionsSchema.parse(role.restrictions ?? {});
        },
        { minRoleLevel: 2, requiredPermissions: [PERMISSIONS['role:view']] },
      );
      return { success: true, data: restrictions };
    } catch (error) {
      return toFailure(error);
    }
  },

  /** Mise à jour des restrictions (validation Zod stricte + audit). */
  async updateRestrictions(
    roleIdRaw: string,
    input: unknown,
  ): Promise<ActionResult<{ roleId: string }>> {
    try {
      const roleId = roleIdSchema.parse(roleIdRaw);
      const parsed = roleRestrictionsSchema.parse(input);
      await withSecurePrisma(
        async (ctx) => {
          const existing = await RoleRepository.findRoleById(roleId);
          if (!existing) throw new RestrictionServiceError('Rôle introuvable', 'NOT_FOUND');
          assertRoleOperationAllowed(ctx, existing, 'restrictions');
          // Fusion non destructive avec les restrictions existantes.
          const current =
            existing.restrictions && typeof existing.restrictions === 'object' && !Array.isArray(existing.restrictions)
              ? (existing.restrictions as Record<string, unknown>)
              : {};
          await RoleRepository.updateRole(roleId, {
            restrictions: { ...current, ...parsed },
            updatedBy: ctx.userId,
          });
          await RoleRepository.createAuditLog({
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'ROLE_RESTRICTION_CHANGED',
            targetId: roleId,
            targetType: 'ROLE',
            details: JSON.stringify(parsed),
          });
        },
        { minRoleLevel: 1, requiredPermissions: [PERMISSIONS['role:edit']] },
      );
      return { success: true, data: { roleId }, message: 'Restrictions mises à jour' };
    } catch (error) {
      return toFailure(error);
    }
  },

  /** Réinitialisation : restrictions vides (retour aux défauts RBAC). */
  async resetRestrictions(roleIdRaw: string): Promise<ActionResult<{ roleId: string }>> {
    try {
      const roleId = roleIdSchema.parse(roleIdRaw);
      await withSecurePrisma(
        async (ctx) => {
          const existing = await RoleRepository.findRoleById(roleId);
          if (!existing) throw new RestrictionServiceError('Rôle introuvable', 'NOT_FOUND');
          assertRoleOperationAllowed(ctx, existing, 'restrictions');
          await RoleRepository.updateRole(roleId, { restrictions: {}, updatedBy: ctx.userId });
          await RoleRepository.createAuditLog({
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'ROLE_RESTRICTIONS_RESET',
            targetId: roleId,
            targetType: 'ROLE',
          });
        },
        { minRoleLevel: 1, requiredPermissions: [PERMISSIONS['role:edit']] },
      );
      return { success: true, data: { roleId }, message: 'Restrictions réinitialisées' };
    } catch (error) {
      return toFailure(error);
    }
  },
};
