// server/actions/user-admin-actions.ts
'use server'

import { UserAdminService } from '@/server/services/user-admin-service'
import { blockUserSchema, unblockUserSchema } from '@/lib/validations/role'
import { revalidatePath } from 'next/cache'

type ActionResult<T = unknown> = 
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code: string; fieldErrors?: Record<string, string[]> }

// ─── Bloquer un utilisateur ───

export async function blockUserAction(formData: FormData): Promise<ActionResult> {
  try {
    const raw = Object.fromEntries(formData)
    
    const parsed = blockUserSchema.safeParse({
      userId: raw.userId,
      reason: raw.reason,
      blockedUntil: raw.blockedUntil || null,
      permanent: raw.permanent === 'on' || raw.permanent === 'true',
    })

    if (!parsed.success) {
      return {
        success: false,
        error: 'Données invalides',
        code: 'VALIDATION_ERROR',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const result = await UserAdminService.block(parsed.data)
    
    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${parsed.data.userId}`)
    
    return {
      success: true,
      data: result,
      message: `Utilisateur ${result.email} bloqué${result.permanent ? ' définitivement' : ''}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
      code: (error as any)?.code || 'INTERNAL_ERROR',
    }
  }
}

// ─── Débloquer un utilisateur ───

export async function unblockUserAction(formData: FormData): Promise<ActionResult> {
  try {
    const raw = Object.fromEntries(formData)
    
    const parsed = unblockUserSchema.safeParse({
      userId: raw.userId,
      reason: raw.reason || undefined,
    })

    if (!parsed.success) {
      return {
        success: false,
        error: 'Données invalides',
        code: 'VALIDATION_ERROR',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const result = await UserAdminService.unblock(parsed.data)
    
    revalidatePath('/admin/users')
    
    return {
      success: true,
      data: result,
      message: `Utilisateur ${result.email} débloqué`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
      code: (error as any)?.code || 'INTERNAL_ERROR',
    }
  }
}

// ─── Lister les utilisateurs bloqués ───

export async function listBlockedUsersAction(): Promise<ActionResult> {
  try {
    const users = await UserAdminService.listBlocked()
    return { success: true, data: users }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
      code: (error as any)?.code || 'INTERNAL_ERROR',
    }
  }
}

// ─── Assigner un rôle ───

export async function assignRoleAction(
  userId: string, 
  roleId: string
): Promise<ActionResult> {
  try {
    const result = await UserAdminService.assignRole(userId, roleId)
    
    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${userId}`)
    
    return {
      success: true,
      data: result,
      message: `Rôle assigné avec succès`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
      code: (error as any)?.code || 'INTERNAL_ERROR',
    }
  }
}
