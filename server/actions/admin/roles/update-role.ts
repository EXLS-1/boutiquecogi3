// server/actions/admin/roles/update-role.ts
'use server';

import { revalidatePath } from 'next/cache';
import { RoleService } from '@/lib/admin/roles/role.service';
import { ROLE_MODULE_ROUTES } from '@/lib/admin/roles/role.constants';
import type { ActionResult, RoleDto } from '@/lib/admin/roles/role.types';

export async function updateRoleAction(
  roleId: string,
  input: { description?: string; isActive?: boolean },
): Promise<ActionResult<RoleDto>> {
  const result = await RoleService.updateRole(roleId, input);
  if (result.success) revalidatePath(ROLE_MODULE_ROUTES.roles);
  return result;
}
