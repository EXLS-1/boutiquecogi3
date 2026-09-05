'use server';

import { revalidatePath } from 'next/cache';
import { RoleAdminService } from '@/server/services/role-admin-service';

type Result<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

function failure(error: unknown): Result<never> {
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Erreur serveur',
    code: error && typeof error === 'object' && 'code' in error ? String(error.code) : 'INTERNAL_ERROR',
  };
}

export async function updateRolePermissionsAction(roleId: string, permissionIds: string[]): Promise<Result> {
  try {
    const data = await RoleAdminService.updatePermissions(roleId, permissionIds);
    revalidatePath('/admin/roles');
    revalidatePath('/admin/role_permissions');
    return { success: true, data };
  } catch (error) {
    return failure(error);
  }
}

export async function updateRoleRestrictionsAction(roleId: string, restrictions: unknown): Promise<Result> {
  try {
    const data = await RoleAdminService.updateRestrictions(roleId, restrictions);
    revalidatePath('/admin/roles');
    revalidatePath('/admin/role_restrictions');
    return { success: true, data };
  } catch (error) {
    return failure(error);
  }
}

export async function updatePermissionOverrideAction(input: {
  roleAssignmentId: string;
  permissionId: string;
  isGranted: boolean;
  expiresAt?: string | null;
}): Promise<Result> {
  try {
    const data = await RoleAdminService.updateOverride({
      ...input,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    });
    revalidatePath('/admin/role_audit');
    return { success: true, data };
  } catch (error) {
    return failure(error);
  }
}