// server/actions/admin/roles/deactivate-role.ts
'use server';

import { revalidatePath } from 'next/cache';
import { RoleService } from '@/lib/admin/roles/role.service';
import { ROLE_MODULE_ROUTES } from '@/lib/admin/roles/role.constants';
import type { ActionResult, RoleDto } from '@/lib/admin/roles/role.types';

export async function deactivateRoleAction(roleId: string): Promise<ActionResult<RoleDto>> {
  const result = await RoleService.setActiveRole(roleId, false);
  if (result.success) revalidatePath(ROLE_MODULE_ROUTES.roles);
  return result;
}
