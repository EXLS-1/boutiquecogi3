// types/payment.ts
// Types pour les transactions, modes de paiement et réponses des passerelles.

export type PaymentIntent = {
  id: string;
  amount: number;
  currency: string;
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
