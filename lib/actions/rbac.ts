// lib/actions/rbac.ts
'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { resolveAuthContext } from '@/lib/auth/server';
import { PERMISSIONS, ROLES, type ToggleState } from '@/lib/auth/rbac';
import { invalidateRoleCache } from '@/lib/auth/rbac-cache';
import { rbacSchema, type RbacValues } from '@/lib/rbac';

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * Synchronise les permissions d'un rôle (RBAC).
 * Stockage : JSON `permissions` ({ code: "ON" | "OFF" }) sur `RoleConfig`,
 * source du moteur RBAC runtime (cf. rbac-cache.ts).
 * Sécurisé : vérifie les droits ADMIN avant exécution.
 */
export async function syncRolePermissionsAction(
  data: RbacValues,
): Promise<ActionResponse<null>> {
  try {
    // 1. Vérification de l'authentification et des rôles
    const authContext = await resolveAuthContext();
    if (!authContext || authContext.user.role !== ROLES.ADMIN) {
      return { success: false, error: 'Non autorisé.' };
    }

    // 2. Validation stricte des données (Zod)
    const { roleId, permissions } = rbacSchema.parse(data);

    // 3. Le rôle doit exister
    const roleConfig = await db.roleConfig.findUnique({ where: { id: roleId } });
    if (!roleConfig) {
      return { success: false, error: 'Rôle introuvable.' };
    }

    // 4. Construire la map complète { code: ON/OFF } (sync = remplacement total)
    const permissionMap: Record<string, ToggleState> = {};
    for (const code of Object.values(PERMISSIONS)) {
      permissionMap[code] = permissions.includes(code) ? 'ON' : 'OFF';
    }

    // 5. Écriture dans RoleConfig (source unique du moteur RBAC runtime)
    await db.roleConfig.update({
      where: { id: roleConfig.id },
      data: { permissions: permissionMap },
    });

    // 6. Invalider le cache RBAC pour prise en compte immédiate
    await invalidateRoleCache(roleConfig.role);

    revalidatePath('/dashboard/settings');
    return { success: true, data: null };
  } catch (error) {
    console.error('[RBAC_ACTION_ERROR]', error);
    return { success: false, error: 'Erreur lors de la synchronisation.' };
  }
}

