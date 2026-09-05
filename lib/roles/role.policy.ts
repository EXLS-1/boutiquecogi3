import type { RoleConfig } from '@prisma/client';

import type { SecureContext } from '@/server/core/secure-prisma';

export type RoleMutation = 'update' | 'delete';

export function assertRoleMutationAllowed(
  context: Pick<SecureContext, 'roleLevel'>,
  target: Pick<RoleConfig, 'level' | 'role' | 'isSystem'>,
  mutation: RoleMutation,
): void {
  if (target.level === 1 || target.role === 'SUPER_ADMIN') {
    throw new Error('Le rôle SUPER_ADMIN est immuable');
  }

  if (mutation === 'delete' && target.isSystem) {
    throw new Error('Les rôles système ne peuvent pas être supprimés');
  }

  if (context.roleLevel >= target.level) {
    throw new Error('Vous ne pouvez pas administrer un rôle de niveau égal ou supérieur');
  }
}