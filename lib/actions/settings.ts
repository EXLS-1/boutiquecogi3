// lib/actions/settings.ts
'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { resolveAuthContext } from '@/lib/auth/server';
import { getRoleLevel, normalizeRole } from '@/lib/auth/rbac';
import { SETTINGS_KEYS } from '@/lib/constants/settings';
import { generalSettingsSchema, type GeneralSettingsValues } from '@/lib/validations/settings';

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * Met à jour les paramètres généraux de la plateforme.
 * Stockage : `SystemConfiguration` (clé = SETTINGS_KEYS, valeur = chaîne brute).
 * Sécurisé : vérifie les droits ADMIN avant exécution.
 */
export async function updateGeneralSettingsAction(
  data: GeneralSettingsValues,
): Promise<ActionResponse<GeneralSettingsValues>> {
  try {
    // 1. Vérification de l'authentification et des rôles (garde RBAC canonique)
    //    Niveaux 1-2 : SUPER_ADMIN et ADMIN
    const authContext = await resolveAuthContext();
    const actorLevel = authContext ? getRoleLevel(normalizeRole(authContext.user.role)) : 0;
    if (!authContext || !Number.isInteger(actorLevel) || actorLevel < 1 || actorLevel > 2) {
      return { success: false, error: 'Accès non autorisé.', code: 'FORBIDDEN' };
    }

    // 2. Validation stricte des données (Zod)
    const validatedData = generalSettingsSchema.parse(data);

    // 3. Écriture en base (une ligne SystemConfiguration par clé)
    await db.$transaction(
      Object.entries(validatedData).map(([key, value]) =>
        db.systemConfiguration.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        }),
      ),
    );

    // 4. Invalidations du cache pour mise à jour UI
    revalidatePath('/dashboard/settings');
    revalidatePath('/', 'layout'); // Si le nom de la boutique est dans le header

    return { success: true, data: validatedData };
  } catch (error) {
    console.error('[SETTINGS_ACTION_ERROR]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue.',
    };
  }
}

