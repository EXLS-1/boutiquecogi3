// server/actions/user-admin-actions.ts

'use server'

import { UserAdminService } from '@/server/services/user-admin-service'
import { blockUserSchema, unblockUserSchema, assignRoleSchema } from '@/lib/validations/role'
import { revalidatePath } from 'next/cache'
import { AuthorizationError } from '@/server/core/secure-prisma'

type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code: string; fieldErrors?: Record<string, string[] | undefined> }

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
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message, code: error.code }
    }
    if (error instanceof Error) {
      return { success: false, error: error.message, code: (error as any).code || 'UNKNOWN_ERROR' }
    }
    return { success: false, error: 'Erreur serveur', code: 'INTERNAL_ERROR' }
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
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message, code: error.code }
    }
    if (error instanceof Error) {
      return { success: false, error: error.message, code: (error as any).code || 'UNKNOWN_ERROR' }
    }
    return { success: false, error: 'Erreur serveur', code: 'INTERNAL_ERROR' }
  }
}

// ─── Lister les utilisateurs bloqués ───

export async function listBlockedUsersAction(): Promise<ActionResult> {
  try {
    const users = await UserAdminService.listBlocked()
    return { success: true, data: users }
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message, code: error.code }
    }
    return { success: false, error: 'Erreur serveur', code: 'INTERNAL_ERROR' }
  }
}

// ─── Lister tous les utilisateurs ───

export async function listUsersAction(): Promise<ActionResult> {
  try {
    const users = await UserAdminService.listUsers()
    return { success: true, data: users }
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message, code: error.code }
    }
    return { success: false, error: 'Erreur serveur', code: 'INTERNAL_ERROR' }
  }
}

// ─── Assigner un rôle ───

export async function assignRoleAction(
  userId: string,
  roleId: string
): Promise<ActionResult> {
  try {
    const result = await UserAdminService.assignRole({ userId, roleId })
    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${userId}`)

    return {
      success: true,
      data: result,
      message: `Rôle assigné avec succès`,
    }
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

// ─── Mettre à jour le rôle d'un utilisateur ───

export async function updateUserRole(
  userId: string,
  role: string
): Promise<ActionResult> {
  try {
    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        error: 'ID utilisateur invalide',
        code: 'VALIDATION_ERROR',
      }
    }

    if (!role || typeof role !== 'string') {
      return {
        success: false,
        error: 'Rôle invalide',
        code: 'VALIDATION_ERROR',
      }
    }

    const result = await UserAdminService.assignRole({ userId, roleId: role })
    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${userId}`)

    return {
      success: true,
      data: result,
      message: `Rôle mis à jour avec succès`,
    }
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
