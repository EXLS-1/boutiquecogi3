// lib/actions/system.ts
'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { resolveAuthContext } from '@/lib/auth/server';
import { getRoleLevel, normalizeRole } from '@/lib/auth/rbac';
import { SYSTEM_CONFIG_KEY } from '@/lib/constants/settings';
import { systemConfigSchema, type SystemConfigValues } from '@/lib/system';

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * Met à jour la configuration système (mode maintenance, logs, cache).
 * Stockage : `SystemConfiguration` (clé = SYSTEM_CONFIG_KEY, valeur JSON
 * validée par `systemConfigSchema` — même clé que la page de paramètres).
 * Sécurisé : vérifie les droits ADMIN avant exécution.
 */
export async function updateSystemConfigAction(
  data: SystemConfigValues,
): Promise<ActionResponse<null>> {
  try {
    // 1. Vérification de l'authentification et des rôles — niveaux 1-2 : SUPER_ADMIN et ADMIN
    const authContext = await resolveAuthContext();
    const actorLevel = authContext ? getRoleLevel(normalizeRole(authContext.user.role)) : 0;
    if (!authContext || !Number.isInteger(actorLevel) || actorLevel < 1 || actorLevel > 2) {
      return { success: false, error: 'Non autorisé.', code: 'FORBIDDEN' };
    }

    // 2. Validation stricte des données (Zod)
    const validated = systemConfigSchema.parse(data);

    // 3. Écriture (JSON) — même clé que la lecture de la page
    await db.systemConfiguration.upsert({
      where: { key: SYSTEM_CONFIG_KEY },
      update: { value: JSON.stringify(validated) },
      create: { key: SYSTEM_CONFIG_KEY, value: JSON.stringify(validated) },
    });

    // 4. Invalidation globale si le mode maintenance change
    revalidatePath('/', 'layout');
    revalidatePath('/dashboard/settings');

    return { success: true, data: null };
  } catch (error) {
    console.error('[SYSTEM_ACTION_ERROR]', error);
    return { success: false, error: 'Erreur de configuration système.' };
  }
}

