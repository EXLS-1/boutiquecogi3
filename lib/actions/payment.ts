// lib/actions/payment.ts
'use server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { paymentSchema, MASKED_KEY, ROLES } from '@/lib/payment';

export async function updatePaymentSettingsAction(data: PaymentValues) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user.role !== ROLES.ADMIN) return { success: false, error: 'Non autorisé.' };

    const validated = paymentSchema.parse(data);
    
    // Si la clé secrète est masquée, on ne la met pas à jour
    const updateData = { ...validated };
    if (validated.secretKey === MASKED_KEY) delete updateData.secretKey;

    await db.paymentConfig.upsert({
      where: { provider: validated.provider },
      update: updateData,
      create: updateData,
    });

    revalidatePath('/dashboard/settings/payment');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Erreur de configuration paiement.' };
  }
}
