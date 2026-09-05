// server/actions/admin/roles/block-role.ts
'use server';

import { revalidatePath } from 'next/cache';
import { RoleService } from '@/lib/admin/roles/role.service';
import { ROLE_MODULE_ROUTES } from '@/lib/admin/roles/role.constants';
import type { ActionResult, RoleDto } from '@/lib/admin/roles/role.types';

export async function blockRoleAction(
  roleId: string,
  reason?: string,
): Promise<ActionResult<RoleDto>> {
  const result = await RoleService.setBlockedRole(roleId, true, reason);
  if (result.success) {
    revalidatePath(ROLE_MODULE_ROUTES.roles);
    revalidatePath(ROLE_MODULE_ROUTES.roleAudit);
  }
  return result;
}
