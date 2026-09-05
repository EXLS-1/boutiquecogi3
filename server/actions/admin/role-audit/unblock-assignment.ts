// server/actions/admin/role-audit/unblock-assignment.ts
'use server';

import { revalidatePath } from 'next/cache';
import { AuditService } from '@/lib/admin/roles/audit.service';
import { ROLE_MODULE_ROUTES } from '@/lib/admin/roles/role.constants';
import type { ActionResult, AssignmentDto } from '@/lib/admin/roles/role.types';

export async function unblockAssignmentAction(
  assignmentId: string,
): Promise<ActionResult<AssignmentDto>> {
  const result = await AuditService.setAssignmentBlocked(assignmentId, false);
  if (result.success) revalidatePath(ROLE_MODULE_ROUTES.roleAudit);
  return result;
}
