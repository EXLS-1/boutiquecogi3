// server/actions/role-actions.ts

'use server'

import { RoleService } from '@/server/services/role-service'
import { createRoleSchema } from '@/lib/validations/role'
import { revalidatePath } from 'next/cache'
import { AuthorizationError } from '@/server/core/secure-prisma'

type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code: string; fieldErrors?: Record<string, string[]> }

export async function createRoleAction(formData: FormData): Promise<ActionResult> {
  try {
    const raw = Object.fromEntries(formData)

    const parsed = createRoleSchema.safeParse({
      name: raw.name,
      level: Number(raw.level),
      description: raw.description || '',
      defaultPermissionCodes: raw.defaultPermissionCodes
        ? JSON.parse(raw.defaultPermissionCodes as string)
        : [],
      isActive: raw.isActive === 'on' || raw.isActive === 'true',
    })

    if (!parsed.success) {
      return {
        success: false,
        error: 'Données invalides',
        code: 'VALIDATION_ERROR',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const role = await RoleService.create(parsed.data)
    revalidatePath('/admin/roles')

    return {
      success: true,
      data: role,
      message: `Rôle "${role.name}" créé avec succès`,
    }
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message, code: error.code }
    }
    if (error instanceof Error) {
      return { success: false, error: error.message, code: (error as any).code || 'UNKNOWN_ERROR' }
    }
    return { success: false, error: 'Erreur serveur inattendue', code: 'INTERNAL_ERROR' }
  }
}

export async function listRolesAction(): Promise<ActionResult> {
  try {
    const roles = await RoleService.list()
    return { success: true, data: roles }
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message, code: error.code }
    }
    return { success: false, error: 'Erreur serveur', code: 'INTERNAL_ERROR' }
  }
}

export async function updateRoleAction(
  roleId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const raw = Object.fromEntries(formData)
    const data: Record<string, unknown> = {}
    if (raw.description) data.description = raw.description
    if (raw.isActive !== undefined) data.isActive = raw.isActive === 'on' || raw.isActive === 'true'
    if (raw.defaultPermissionCodes) data.defaultPermissionCodes = JSON.parse(raw.defaultPermissionCodes as string)

    const role = await RoleService.update(roleId, data)
    revalidatePath('/admin/roles')

    return { success: true, data: role, message: 'Rôle mis à jour' }
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message, code: error.code }
    }
    if (error instanceof Error) {
      return { success: false, error: error.message, code: (error as any).code || 'UNKNOWN_ERROR' }
    }
    return { success: false, error: 'Erreur serveur', code: 'INTERNAL_ERROR' }
  }
}

export async function deleteRoleAction(roleId: string): Promise<ActionResult> {
  try {
    const result = await RoleService.delete(roleId)
    revalidatePath('/admin/roles')
    return { success: true, data: result, message: 'Rôle supprimé' }
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message, code: error.code }
    }
    if (error instanceof Error) {
      return { success: false, error: error.message, code: (error as any).code || 'UNKNOWN_ERROR' }
    }
    return { success: false, error: 'Erreur serveur', code: 'INTERNAL_ERROR' }
  }
}
