// prisma/seed/factories/payment.factory.ts
// ============================================
// GÉNÉRATEUR DE PAIEMENTS CINETPAY / MOBILE MONEY
// ============================================

import { Currency, PaymentStatus, PaymentMethodType } from "@prisma/client";
import { generateDeterministicUuidV7 } from "../utils/uuid";
import { createSeededRandom, randInt, pick } from "../utils/random";
import { usdCentsToCdf } from "../utils/currency";


export interface GeneratedPayment {
  id: string;
  orderId: string;
  amount: number; // cents pour USD, francs pour CDF
  currency: Currency;
  status: PaymentStatus;
  method: PaymentMethodType;
  transactionId: string;
  paidAt: Date | null;
}

const METHODS: PaymentMethodType[] = [
  PaymentMethodType.CINETPAY,
  PaymentMethodType.MPESA,
  PaymentMethodType.ORANGE_MONEY,
  PaymentMethodType.AIRTEL_MONEY,
  PaymentMethodType.CASH_ON_DELIVERY,
];

/**
 * Construit un paiement pour une commande.
 * Le statut dépend du statut de commande (fourni par l'appelant).
 */
export function buildPaymentFactory(
  index: number,
  orderId: string,
  totalAmountCents: number,
  seedNumber: number,
  options: { status?: PaymentStatus; currency?: Currency } = {},
): GeneratedPayment {
  const rand = createSeededRandom(seedNumber, "payment", index);
  // Pour CDF, convertir les cents USD en francs au taux configuré.
  const currency = options.currency ?? Currency.USD;
  const amount = currency === "USD" ? totalAmountCents : usdCentsToCdf(totalAmountCents);

  const status = options.status ?? PaymentStatus.COMPLETED;
  const paidAt =
    status === PaymentStatus.COMPLETED || status === PaymentStatus.REFUNDED
      ? new Date(Date.now() - randInt(rand, 1, 10) * 3600000)
      : null;

  return {
    id: generateDeterministicUuidV7("payment", index),
    orderId,
    amount,
    currency,
    status,
    method: pick(rand, METHODS),
    transactionId: `CP-RDC-${Date.now()}-${index}`,
    paidAt,
  };
}
