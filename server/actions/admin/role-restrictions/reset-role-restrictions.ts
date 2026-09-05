// server/actions/admin/role-restrictions/reset-role-restrictions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { RestrictionService } from '@/lib/admin/roles/restriction.service';
import { ROLE_MODULE_ROUTES } from '@/lib/admin/roles/role.constants';
import type { ActionResult } from '@/lib/admin/roles/role.types';

export async function resetRoleRestrictionsAction(
  roleId: string,
): Promise<ActionResult<{ roleId: string }>> {
  const result = await RestrictionService.resetRestrictions(roleId);
  if (result.success) {
    revalidatePath(ROLE_MODULE_ROUTES.roleRestrictions);
    revalidatePath(ROLE_MODULE_ROUTES.roles);
  }
  return result;
}
