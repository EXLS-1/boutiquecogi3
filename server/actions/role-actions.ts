// server/actions/role-actions.ts

'use server'

import { RoleService } from '@/server/services/role-service'
import { createRoleSchema } from '@/lib/validations/role'
import { revalidatePath } from 'next/cache'

// ─── Types de retour standardisés ───

type ActionResult<T = unknown> = 
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code: string; fieldErrors?: Record<string, string[]> }

// ─── Créer un rôle ───

export async function createRoleAction(formData: FormData): Promise<ActionResult> {
  try {
    const raw = Object.fromEntries(formData)
    
    const parsed = createRoleSchema.safeParse({
      ...raw,
      level: Number(raw.level),
      isActive: raw.isActive === 'on' || raw.isActive === 'true',
      defaultPermissionCodes: raw.defaultPermissionCodes 
        ? JSON.parse(raw.defaultPermissionCodes as string) 
        : [],
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
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
        code: (error as any).code || 'UNKNOWN_ERROR',
      }
    }
    return {
      success: false,
      error: 'Erreur serveur inattendue',
      code: 'INTERNAL_ERROR',
    }
  }
}

// ─── Lister les rôles ───

export async function listRolesAction(): Promise<ActionResult> {
  try {
    const roles = await RoleService.list()
    return { success: true, data: roles }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
      code: (error as any)?.code || 'INTERNAL_ERROR',
    }
  }
}

// ─── Supprimer un rôle ───

export async function deleteRoleAction(roleId: string): Promise<ActionResult> {
  try {
    const result = await RoleService.delete(roleId)
    revalidatePath('/admin/roles')
    return {
      success: true,
      data: result,
      message: `Rôle supprimé`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
      code: (error as any)?.code || 'INTERNAL_ERROR',
    }
  }
}
