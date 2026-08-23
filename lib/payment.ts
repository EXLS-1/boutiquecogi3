// lib/payment.ts
import { z } from 'zod';

export const PAYMENT_PROVIDERS = { STRIPE: 'STRIPE', PAYPAL: 'PAYPAL' } as const;
export const MASKED_KEY = '••••••••••••••••';

export const paymentSchema = z.object({
  provider: z.enum(Object.values(PAYMENT_PROVIDERS) as [string, ...string[]]),
  publicKey: z.string().min(1, 'Clé publique requise'),
  secretKey: z.string().optional(), // Optionnel car masqué
  isEnabled: z.boolean(),
});
export type PaymentValues = z.infer<typeof paymentSchema>;
