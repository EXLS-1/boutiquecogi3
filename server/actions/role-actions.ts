// server/actions/role-actions.ts

'use server'

import { RoleService, RoleServiceError } from '@/server/services/role-service'
import { createRoleSchema, updateRoleSchema } from '@/lib/validations/role.schema'
import { revalidatePath } from 'next/cache'
import { AuthorizationError } from '@/server/core/secure-prisma'
import type { ActionResult } from '@/server/core/action-result'
import { recordServerActionAudit, AuditSeverity } from '@/server/services/audit.service'

// ─── Error helpers ────────────────────────────────────────────────────────────

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

export async function createRoleAction(formData: FormData): Promise<ActionResult> {
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

  try {
    const role = await RoleService.create(parsed.data)

    await recordServerActionAudit({
      action: 'ROLE_CREATE',
      targetId: role.id,
      targetType: 'ROLE',
      severity: AuditSeverity.WARNING,
      details: { name: role.name, level: role.level },
    })

    revalidatePath('/admin/roles')
    return { success: true, data: role, message: `Rôle "${role.name}" créé avec succès` }
  } catch (error) {
    await recordServerActionAudit({
      action: 'ROLE_CREATE',
      targetType: 'ROLE',
      severity: AuditSeverity.WARNING,
      status: 'FAILURE',
      error: getErrorMessage(error),
    })
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
  const raw = Object.fromEntries(formData)

  const updateData: Record<string, unknown> = {}
  if (raw.description !== undefined) updateData.description = raw.description
  if (raw.isActive !== undefined) updateData.isActive = raw.isActive === 'on' || raw.isActive === 'true'
  if (raw.defaultPermissionCodes) {
    updateData.defaultPermissionCodes = JSON.parse(raw.defaultPermissionCodes as string)
  }

  const parsed = updateRoleSchema.safeParse(updateData)

  if (!parsed.success) {
    return {
      success: false,
      error: 'Données invalides',
      code: 'VALIDATION_ERROR',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const role = await RoleService.update(roleId, parsed.data)

    await recordServerActionAudit({
      action: 'ROLE_UPDATE',
      targetId: roleId,
      targetType: 'ROLE',
      severity: AuditSeverity.WARNING,
      details: { changes: parsed.data },
    })

    revalidatePath('/admin/roles')
    return { success: true, data: role, message: 'Rôle mis à jour' }
  } catch (error) {
    await recordServerActionAudit({
      action: 'ROLE_UPDATE',
      targetId: roleId,
      targetType: 'ROLE',
      severity: AuditSeverity.WARNING,
      status: 'FAILURE',
      error: getErrorMessage(error),
    })
    return { success: false, error: getErrorMessage(error), code: getErrorCode(error) }
  }
}

export async function deleteRoleAction(roleId: string): Promise<ActionResult> {
  try {
    const result = await RoleService.delete(roleId)

    await recordServerActionAudit({
      action: 'ROLE_DELETE',
      targetId: roleId,
      targetType: 'ROLE',
      severity: AuditSeverity.CRITICAL,
    })

    revalidatePath('/admin/roles')
    return { success: true, data: result, message: 'Rôle supprimé' }
  } catch (error) {
    await recordServerActionAudit({
      action: 'ROLE_DELETE',
      targetId: roleId,
      targetType: 'ROLE',
      severity: AuditSeverity.CRITICAL,
      status: 'FAILURE',
      error: getErrorMessage(error),
    })
    return { success: false, error: getErrorMessage(error), code: getErrorCode(error) }
  }
}
