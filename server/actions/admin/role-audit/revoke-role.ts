// server/actions/admin/role-audit/revoke-role.ts
'use server';

import { revalidatePath } from 'next/cache';
import { AuditService } from '@/lib/admin/roles/audit.service';
import { ROLE_MODULE_ROUTES } from '@/lib/admin/roles/role.constants';
import type { ActionResult } from '@/lib/admin/roles/role.types';

export async function revokeRoleAction(
  assignmentId: string,
): Promise<ActionResult<{ id: string }>> {
  const result = await AuditService.revokeRole(assignmentId);
  if (result.success) {
    revalidatePath(ROLE_MODULE_ROUTES.roleAudit);
    revalidatePath(ROLE_MODULE_ROUTES.roles);
  }
  return result;
}
