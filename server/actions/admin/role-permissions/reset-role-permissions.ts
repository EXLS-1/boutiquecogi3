// server/actions/admin/role-permissions/reset-role-permissions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { PermissionService } from '@/lib/admin/roles/permission.service';
import { ROLE_MODULE_ROUTES } from '@/lib/admin/roles/role.constants';
import type { ActionResult } from '@/lib/admin/roles/role.types';

export async function resetRolePermissionsAction(
  roleId: string,
): Promise<ActionResult<{ roleId: string }>> {
  const result = await PermissionService.resetPermissions(roleId);
  if (result.success) {
    revalidatePath(ROLE_MODULE_ROUTES.rolePermissions);
    revalidatePath(ROLE_MODULE_ROUTES.roles);
  }
  return result;
}
