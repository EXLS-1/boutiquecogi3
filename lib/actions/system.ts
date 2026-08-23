// lib/actions/system.ts
'use server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { systemConfigSchema, ROLES } from '@/lib/system';

export async function updateSystemConfigAction(data: SystemConfigValues) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user.role !== ROLES.ADMIN) return { success: false, error: 'Non autorisé.' };

    const validated = systemConfigSchema.parse(data);

    await db.systemConfig.upsert({
      where: { id: 'main' },
      update: validated,
      create: { id: 'main', ...validated },
    });

    // Invalidation globale si le mode maintenance change
    revalidatePath('/', 'layout'); 
    revalidatePath('/dashboard/settings/system');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Erreur de configuration système.' };
  }
}
