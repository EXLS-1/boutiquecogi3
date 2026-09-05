// lib/actions/rbac.ts

'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { resolveAuthContext } from '@/lib/auth/server';
import { ROLES, getRoleLevel, type Role } from '@/lib/auth/rbac';
import { invalidateRoleCache } from '@/lib/auth/rbac-cache';
import { rbacSchema, type RbacValues } from '@/lib/rbac';

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * Synchronise les permissions d'un rôle (RBAC).
 * Source de vérité : le catalogue `Permission` associé via `RolePermission`
 * (relation normalisée). Le champ déprécié `RoleConfig.permissions` (JSON)
 * n'est plus écrit ni lu par le moteur.
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

    // 4. Remplacement total de l'association RolePermission (source de vérité)
    const granted = await db.permission.findMany({
      where: { code: { in: permissions } },
      select: { id: true },
    });
    if (granted.length !== new Set(permissions).size) {
      return { success: false, error: 'Une ou plusieurs permissions sont inconnues.' };
    }

    await db.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleconfigId: roleConfig.id } });
      if (granted.length) {
        await tx.rolePermission.createMany({
          data: granted.map(({ id }) => ({
            roleconfigId: roleConfig.id,
            permissionId: id,
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          userId: authContext.user.id,
          roleLevel: getRoleLevel(authContext.user.role as Role),
          action: 'ROLE_PERMISSIONS_SYNCED',
          targetId: roleConfig.id,
          targetType: 'ROLE',
          details: JSON.stringify({ permissions }),
        },
      });
    });

    // 5. Invalider le cache RBAC pour prise en compte immédiate
    await invalidateRoleCache(roleConfig.role);

    revalidatePath('/dashboard/settings');
    return { success: true, data: null };
  } catch (error) {
    console.error('[RBAC_ACTION_ERROR]', error);
    return { success: false, error: 'Erreur lors de la synchronisation.' };
  }
}

