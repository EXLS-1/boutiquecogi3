// server/actions/admin/role-permissions/update-role-permissions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { PermissionService } from '@/lib/admin/roles/permission.service';
import { ROLE_MODULE_ROUTES } from '@/lib/admin/roles/role.constants';
import type { ActionResult } from '@/lib/admin/roles/role.types';

export async function updateRolePermissionsAction(
  roleId: string,
  permissionIds: string[],
): Promise<ActionResult<{ roleId: string }>> {
  const result = await PermissionService.updatePermissions(roleId, permissionIds);
  if (result.success) {
    revalidatePath(ROLE_MODULE_ROUTES.rolePermissions);
    revalidatePath(ROLE_MODULE_ROUTES.roles);
  }
  return result;
}
