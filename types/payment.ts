// types/payment.ts
// Types pour les transactions, modes de paiement et réponses des passerelles.

import type { Currency } from "@prisma/client";

export type PaymentIntent = {
  id: string;
  amount: number;
  currency: Currency;
  status:
    | "requires_payment_method"
    | "requires_confirmation"
    | "succeeded"
    | "canceled";
  paymentMethodId?: string;
  clientSecret?: string;
};

export type PaymentResult = {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
};
