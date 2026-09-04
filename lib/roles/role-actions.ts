// lib/roles/role-actions.ts
// ============================================================
// Server Actions - logique métier de la gestion des rôles.
// Centralise les requêtes (via RoleService, renforcé par
// withSecurePrisma : RBAC + audit) et revalide le cache Next.
// ============================================================

'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@/lib/prisma';
import { ROLES_CONSTANTS } from '@/constants/roles';
import {
  roleFormSchema,
  roleUpdateSchema,
  type RoleFormValues,
  type RoleUpdateValues,
} from '@/lib/roles/role-schema';
import { RoleService } from '@/server/services/role-service';
import type { Role, RolePermissionRef } from '@/types/role';

export type RoleActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | {
      success: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[]>;
    };

function toError(error: unknown, fallback = ROLES_CONSTANTS.MESSAGES.ERROR_GENERIC): RoleActionResult<never> {
  if (error instanceof Error) {
    const code = (error as { code?: string }).code;
    return { success: false, error: error.message || fallback, code };
  }
  return { success: false, error: fallback };
}

/**
 * Récupère tous les rôles (défini dans RoleService.list, sécurisé RBAC).
 */
export async function getRolesAction(): Promise<RoleActionResult<Role[]>> {
  try {
    const roles = await RoleService.list();
    return { success: true, data: roles };
  } catch (error) {
    return toError(error);
  }
}

/**
 * Catalogue des permissions disponibles (issu de la base, jamais dupliqué).
 */
export async function getRolePermissionsAction(): Promise<RoleActionResult<RolePermissionRef[]>> {
  try {
    const permissions = await prisma.permission.findMany({
      select: { code: true, name: true },
      orderBy: { code: 'asc' },
    });
    return { success: true, data: permissions };
  } catch (error) {
    return toError(error);
  }
}

/**
 * Crée un rôle (création = "upsert" du chemin create de RoleService.create).
 * Validation stricte Zod avant exécution.
 */
export async function createRoleAction(
  data: RoleFormValues,
): Promise<RoleActionResult<{ id: string }>> {
  try {
    const parsed = roleFormSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: 'Données invalides',
        code: 'VALIDATION_ERROR',
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const role = await RoleService.create({
      name: parsed.data.name,
      level: parsed.data.level,
      description: parsed.data.description,
      defaultPermissionCodes: parsed.data.defaultPermissionCodes,
      isActive: parsed.data.isActive,
    });

    revalidatePath(ROLES_CONSTANTS.ROUTES.BASE);
    return {
      success: true,
      data: { id: role.id },
      message: ROLES_CONSTANTS.MESSAGES.CREATE_SUCCESS,
    };
  } catch (error) {
    return toError(error);
  }
}

/**
 * Met à jour un rôle (champs modifiables : description, isActive,
 * et options de permissions si fournies).
 */
export async function updateRoleAction(
  roleId: string,
  data: RoleUpdateValues,
): Promise<RoleActionResult<{ id: string }>> {
  try {
    const parsed = roleUpdateSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: 'Données invalides',
        code: 'VALIDATION_ERROR',
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const role = await RoleService.update(roleId, parsed.data);

    revalidatePath(ROLES_CONSTANTS.ROUTES.BASE);
    return {
      success: true,
      data: { id: roleId },
      message: ROLES_CONSTANTS.MESSAGES.UPDATE_SUCCESS,
    };
  } catch (error) {
    return toError(error);
  }
}

/**
 * Met à jour uniquement la matrice de permissions d'un rôle.
 */
export async function updateRolePermissionsAction(
  roleId: string,
  permissionCodes: string[],
): Promise<RoleActionResult<{ id: string }>> {
  return updateRoleAction(roleId, { defaultPermissionCodes: permissionCodes });
}

/**
 * Supprime un rôle (impossible si des utilisateurs y sont assignés — géré par le service).
 */
export async function deleteRoleAction(roleId: string): Promise<RoleActionResult<{ success: boolean }>> {
  try {
    const result = await RoleService.delete(roleId);
    revalidatePath(ROLES_CONSTANTS.ROUTES.BASE);
    return { success: true, data: result, message: ROLES_CONSTANTS.MESSAGES.DELETE_SUCCESS };
  } catch (error) {
    return toError(error);
  }
}