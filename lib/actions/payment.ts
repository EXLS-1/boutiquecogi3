// lib/actions/payment.ts
'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { resolveAuthContext } from '@/lib/auth/server';
import { ROLES } from '@/lib/auth/rbac';
import { paymentConfigKey } from '@/lib/constants/settings';
import { paymentSchema, MASKED_KEY, type PaymentValues } from '@/lib/payment';

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * Met à jour la configuration d'une passerelle de paiement.
 * Stockage : `SystemConfiguration` (clé = `payment.<PROVIDER>`, valeur JSON).
 * La clé secrète masquée (`MASKED_KEY`) n'écrase jamais le secret existant.
 * Sécurisé : vérifie les droits ADMIN avant exécution.
 */
export async function updatePaymentSettingsAction(
  data: PaymentValues,
): Promise<ActionResponse<null>> {
  try {
    // 1. Vérification de l'authentification et des rôles
    const authContext = await resolveAuthContext();
    if (!authContext || authContext.user.role !== ROLES.ADMIN) {
      return { success: false, error: 'Non autorisé.' };
    }

    // 2. Validation stricte des données (Zod)
    const validated = paymentSchema.parse(data);

    const key = paymentConfigKey(validated.provider);
    const { secretKey, ...publicPart } = validated;

    // 3. Résoudre le secret final : nouvelle clé fournie, sinon conserver l'existant
    let finalSecretKey: string | undefined;
    if (secretKey && secretKey !== MASKED_KEY) {
      finalSecretKey = secretKey;
    } else {
      const existing = await db.systemConfiguration.findUnique({ where: { key } });
      if (existing) {
        try {
          const previous = JSON.parse(existing.value) as { secretKey?: string };
          finalSecretKey = previous.secretKey;
        } catch {
          // Config existante illisible : on repart sans secret
        }
      }
    }

    // 4. Écriture (JSON) — la page ne relit que publicKey/isEnabled via paymentSchema.pick
    const configToStore = finalSecretKey ? { ...publicPart, secretKey: finalSecretKey } : publicPart;
    await db.systemConfiguration.upsert({
      where: { key },
      update: { value: JSON.stringify(configToStore) },
      create: { key, value: JSON.stringify(configToStore) },
    });

    revalidatePath('/dashboard/settings');
    return { success: true, data: null };
  } catch (error) {
    console.error('[PAYMENT_ACTION_ERROR]', error);
    return { success: false, error: 'Erreur de configuration paiement.' };
  }
}

