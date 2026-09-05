// server/actions/admin/role-audit/assign-role.ts
'use server';

import { revalidatePath } from 'next/cache';
import { AuditService } from '@/lib/admin/roles/audit.service';
import { ROLE_MODULE_ROUTES } from '@/lib/admin/roles/role.constants';
import type { ActionResult, AssignmentDto } from '@/lib/admin/roles/role.types';

export async function assignRoleAction(input: {
  userId: string;
  roleId: string;
}): Promise<ActionResult<AssignmentDto>> {
  const result = await AuditService.assignRole(input);
  if (result.success) {
    revalidatePath(ROLE_MODULE_ROUTES.roleAudit);
    revalidatePath(ROLE_MODULE_ROUTES.roles);
  }
  return result;
}
