// server/actions/admin/role-audit/update-permission-override.ts
'use server';

import { revalidatePath } from 'next/cache';
import { AuditService } from '@/lib/admin/roles/audit.service';
import { ROLE_MODULE_ROUTES } from '@/lib/admin/roles/role.constants';
import type { ActionResult, OverrideDto } from '@/lib/admin/roles/role.types';

export async function updatePermissionOverrideAction(input: {
  assignmentId: string;
  permissionId: string;
  isGranted: boolean;
  expiresAt?: string | null;
}): Promise<ActionResult<OverrideDto>> {
  const result = await AuditService.updateOverride(input);
  if (result.success) revalidatePath(ROLE_MODULE_ROUTES.roleAudit);
  return result;
}
