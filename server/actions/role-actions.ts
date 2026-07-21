// server/actions/role-actions.ts

'use server'

import { RoleService, RoleServiceError } from '@/server/services/role-service'
import { createRoleSchema, updateRoleSchema } from '@/lib/validations/role'
import { revalidatePath } from 'next/cache'
import { AuthorizationError } from '@/server/core/secure-prisma'

// ─── Helper type pour les erreurs avec code ───

interface AppError extends Error {
  code?: string
}

function getErrorCode(error: unknown): string {
  if (error instanceof RoleServiceError) return error.code
  if (error instanceof AuthorizationError) return error.code
  if (error instanceof Error && 'code' in error) return (error as AppError).code || 'UNKNOWN_ERROR'
  return 'INTERNAL_ERROR'
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Erreur serveur inattendue'
}

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
    return { success: false, error: getErrorMessage(error), code: getErrorCode(error) }
  }
}

export async function listRolesAction(): Promise<ActionResult> {
  try {
    const roles = await RoleService.list()
    return { success: true, data: roles }
  } catch (error) {
    return { success: false, error: getErrorMessage(error), code: getErrorCode(error) }
  }
}

export async function updateRoleAction(
  roleId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const raw = Object.fromEntries(formData)

    // Construire l'objet data pour la validation
    const updateData: Record<string, unknown> = {}
    if (raw.description !== undefined) updateData.description = raw.description
    if (raw.isActive !== undefined) updateData.isActive = raw.isActive === 'on' || raw.isActive === 'true'
    if (raw.defaultPermissionCodes) {
      updateData.defaultPermissionCodes = JSON.parse(raw.defaultPermissionCodes as string)
    }

    // Validation via Zod
    const parsed = updateRoleSchema.safeParse(updateData)

    if (!parsed.success) {
      return {
        success: false,
        error: 'Données invalides',
        code: 'VALIDATION_ERROR',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const role = await RoleService.update(roleId, parsed.data)
    revalidatePath('/admin/roles')

    return { success: true, data: role, message: 'Rôle mis à jour' }
  } catch (error) {
    return { success: false, error: getErrorMessage(error), code: getErrorCode(error) }
  }
}

export async function deleteRoleAction(roleId: string): Promise<ActionResult> {
  try {
    const result = await RoleService.delete(roleId)
    revalidatePath('/admin/roles')
    return { success: true, data: result, message: 'Rôle supprimé' }
  } catch (error) {
    return { success: false, error: getErrorMessage(error), code: getErrorCode(error) }
  }
}
