// lib/actions/settings.ts
'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth'; // Votre instance Better-Auth
import { db } from '@/lib/db'; // Votre instance Prisma
import { generalSettingsSchema, type GeneralSettingsValues } from '@/lib/validations/settings';

/**
 * Met à jour les paramètres généraux de la plateforme.
 * Sécurisé : Vérifie les droits admin avant exécution.
 */
export async function updateGeneralSettingsAction(data: GeneralSettingsValues) {
  try {
    // 1. Vérification de l'authentification et des rôles (Better-Auth)
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Accès non autorisé.' };
    }

    // 2. Validation stricte des données (Zod)
    const validatedData = generalSettingsSchema.parse(data);

    // 3. Mise à jour en base de données (Prisma)
    // Note: Adaptez 'siteSettings' au nom réel de votre modèle Prisma
    await db.siteSettings.upsert({
      where: { id: 'general' }, // Supposons un ID unique pour les settings globaux
      update: validatedData,
      create: { id: 'general', ...validatedData },
    });

    // 4. Invalidations du cache pour mise à jour UI
    revalidatePath('/dashboard/settings');
    revalidatePath('/', 'layout'); // Si le nom de la boutique est dans le header

    return { success: true, data: validatedData };
  } catch (error) {
    console.error('[SETTINGS_ACTION_ERROR]', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Une erreur est survenue.' 
    };
  }
}
