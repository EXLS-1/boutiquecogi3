// lib/admin/roles/role.policy.ts
// ============================================================
// Policy d'administration des rôles — garde-fous métier.
// Complète la policy existante (lib/roles/role.policy.ts) et
// s'appuie sur la hiérarchie stricte du RBAC.
// ============================================================

import type { RoleConfig } from '@prisma/client';

import type { SecureContext } from '@/server/core/secure-prisma';

export type RoleMutation =
  | 'update'
  | 'delete'
  | 'activate'
  | 'deactivate'
  | 'block'
  | 'unblock'
  | 'permissions'
  | 'restrictions'
  | 'assign'
  | 'revoke'
  | 'override';

export class RolePolicyError extends Error {
  constructor(message: string, public code: string = 'POLICY_DENIED') {
    super(message);
    this.name = 'RolePolicyError';
  }
}

/** Vérifie qu'un administrateur peut muter un rôle cible. */
export function assertRoleMutationAllowed(
  context: Pick<SecureContext, 'roleLevel'>,
  target: Pick<RoleConfig, 'level' | 'role' | 'isSystem'>,
  mutation: RoleMutation,
): void {
  if (target.level === 1 || target.role === 'SUPER_ADMIN') {
    throw new RolePolicyError('Le rôle SUPER_ADMIN est immuable', 'IMMUTABLE_ROLE');
  }

  if (mutation === 'delete' && target.isSystem) {
    throw new RolePolicyError('Les rôles système ne peuvent pas être supprimés', 'SYSTEM_ROLE');
  }

  if (context.roleLevel >= target.level) {
    throw new RolePolicyError(
      'Vous ne pouvez pas administrer un rôle de niveau égal ou supérieur',
      'HIERARCHY_DENIED',
    );
  }
}

/** Un rôle bloqué ne peut pas être administré (sauf déblocage). */
export function assertRoleNotBlocked(
  target: Pick<RoleConfig, 'blockedAt'>,
  mutation: RoleMutation,
): void {
  if (Boolean(target.blockedAt) && mutation !== 'unblock') {
    throw new RolePolicyError(
      'Le rôle est bloqué : débloquez-le avant toute modification',
      'ROLE_BLOCKED',
    );
  }
}

/** Un rôle inactif refuse les mutations opérationnelles. */
export function assertRoleActive(
  target: Pick<RoleConfig, 'isActive'>,
  mutation: RoleMutation,
): void {
  if (!target.isActive && mutation !== 'activate' && mutation !== 'unblock') {
    throw new RolePolicyError(
      'Le rôle est désactivé : réactivez-le avant toute modification',
      'ROLE_INACTIVE',
    );
  }
}

/** Validation complète avant mutation. */
export function assertRoleOperationAllowed(
  context: Pick<SecureContext, 'roleLevel'>,
  target: RoleConfig,
  mutation: RoleMutation,
): void {
  assertRoleMutationAllowed(context, target, mutation);
  assertRoleNotBlocked(target, mutation);
  assertRoleActive(target, mutation);
}
