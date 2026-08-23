// lib/actions/rbac.ts
'use server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { rbacSchema } from '@/lib/rbac';

export async function syncRolePermissionsAction(data: RbacValues) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    // Sécurité : Seul un SUPER_ADMIN ou quelqu'un avec MANAGE_ROLES peut modifier les rôles
    if (session?.user.role !== ROLES.ADMIN) return { success: false, error: 'Non autorisé.' };

    const { roleId, permissions } = rbacSchema.parse(data);

    await db.$transaction([
      db.rolePermission.deleteMany({ where: { roleId } }),
      db.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId, permission: p })),
      }),
    ]);

    revalidatePath('/dashboard/settings/rbac');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Erreur lors de la synchronisation.' };
  }
}
