import { Currency } from "@prisma/client";
// lib/cinetpay-security.ts

import crypto from "crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/* ========================================================================== */
/* ENV VALIDATION */
/* ========================================================================== */

const CINETPAY_API_KEY = process.env.CINETPAY_API_KEY;
const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID;
const CINETPAY_WEBHOOK_SECRET = process.env.CINETPAY_WEBHOOK_SECRET;

if (!CINETPAY_API_KEY || !CINETPAY_SITE_ID || !CINETPAY_WEBHOOK_SECRET) {
  throw new Error(
    "Critical Failure: Missing required CinetPay environment variables.",
  );
}

/* ========================================================================== */
/* CONSTANTS & SCHEMAS */
/* ========================================================================== */

const WEBHOOK_MAX_AGE_MS = 1000 * 60 * 5; // 5 minutes

export const cinetPayWebhookSchema = z.object({
  cpm_site_id: z.string(),
  cpm_trans_id: z.string(),
  cpm_amount: z.union([z.string(), z.number()]),
  cpm_currency: z.enum(Currency),
  cpm_result: z.string(),
  cpm_custom: z.string().min(1, "Order ID reference (cpm_custom) is required"),
  cpm_payment_date: z.string().optional(),
  cpm_payment_time: z.string().optional(),
  signature: z.string(),
});

export type CinetPayWebhookPayload = z.infer<typeof cinetPayWebhookSchema>;

/* ========================================================================== */
/* SECURITY UTILS */
/* ========================================================================== */

function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

/**
 * Concaténation conforme aux exigences de signature CinetPay v2
 */
function buildSignaturePayload(payload: CinetPayWebhookPayload): string {
  return [
    payload.cpm_site_id,
    payload.cpm_trans_id,
    String(payload.cpm_amount),
    payload.cpm_currency,
    payload.cpm_result,
    CINETPAY_WEBHOOK_SECRET,
  ].join("");
}

export function verifyCinetPaySignature(
  payload: CinetPayWebhookPayload,
): boolean {
  const signingPayload = buildSignaturePayload(payload);
  const expectedSignature = crypto
    .createHmac("sha256", CINETPAY_WEBHOOK_SECRET!)
    .update(signingPayload)
    .digest("hex");

  return timingSafeEqual(expectedSignature, payload.signature);
}

/**
 * Combine la date et l'heure de CinetPay pour valider la fraîcheur
 */
export function validateWebhookTimestamp(
  dateStr?: string,
  timeStr?: string,
): boolean {
  if (!dateStr || !timeStr) return true; // Fail-open partiel si non fourni, compensé par l'API check

  // Format attendu généralement: YYYY-MM-DD et HH:mm:ss
  const fullDateTimeStr = `${dateStr}T${timeStr}`;
  const parsed = Date.parse(fullDateTimeStr);

  if (Number.isNaN(parsed)) return false;

  const age = Math.abs(Date.now() - parsed);
  return age <= WEBHOOK_MAX_AGE_MS;
}

/* ========================================================================== */
/* VERIFICATIONS DISTANTES & INTERNES */
/* ========================================================================== */

export async function verifyTransactionWithCinetPay(transactionId: string) {
  try {
    const response = await fetch(
      "https://api-checkout.cinetpay.com/v2/payment/check",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apikey: CINETPAY_API_KEY,
          site_id: CINETPAY_SITE_ID,
          transaction_id: transactionId,
        }),
        cache: "no-store",
      },
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("CinetPay API Connection Error:", error);
    return null;
  }
}

export async function verifyOrderAmountAndCurrency(
  orderId: string,
  amount: number,
  currency: Currency,
): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { totalAmount: true, currency: true },
  });

  if (!order) return false;

  // Évite les pièges des flottants en forçant une comparaison stricte sur chaîne calibrée (2 décimales max)
  const orderAmountFixed = Number(order.totalAmount).toFixed(2);
  const payloadAmountFixed = amount.toFixed(2);

  return (
    orderAmountFixed === payloadAmountFixed &&
    order.currency === currency
  );
}

/* ========================================================================== */
/* SERVICE DE VALIDATION PRINCIPAL */
/* ========================================================================== */

export interface SecureWebhookValidationResult {
  success: boolean;
  reason?: string;
  payload?: CinetPayWebhookPayload;
}

export async function validateSecureCinetPayWebhook(
  rawBody: unknown,
): Promise<SecureWebhookValidationResult> {
  const parsed = cinetPayWebhookSchema.safeParse(rawBody);
  if (!parsed.success) {
    return { success: false, reason: "Malformed payload structure." };
  }

  const payload = parsed.data;

  // 1. Validation de l'identité du site d'origine
  if (payload.cpm_site_id !== CINETPAY_SITE_ID) {
    return { success: false, reason: "Unauthorized site identifier." };
  }

  // 2. Sécurité Temporelle (Anti-replay)
  if (
    !validateWebhookTimestamp(
      payload.cpm_payment_date,
      payload.cpm_payment_time,
    )
  ) {
    return {
      success: false,
      reason: "Webhook timestamp validation failed or stale packet.",
    };
  }

  // 3. Signature HMAC (Vérification locale rapide)
  if (!verifyCinetPaySignature(payload)) {
    return { success: false, reason: "Compromised webhook signature." };
  }

  // 4. Source de vérité absolue : Interrogation directe de l'API CinetPay
  const verification = await verifyTransactionWithCinetPay(
    payload.cpm_trans_id,
  );

  if (
    !verification ||
    verification.code !== "00" ||
    verification.data?.status !== "ACCEPTED"
  ) {
    return {
      success: false,
      reason: "Transaction status non-confirmed by CinetPay remote ledger.",
    };
  }

  // 5. Alignement strict avec la base de données locale (Anti-Fraude de modification de prix)
  const amountValid = await verifyOrderAmountAndCurrency(
    payload.cpm_custom,
    Number(payload.cpm_amount),
    payload.cpm_currency,
  );

  if (!amountValid) {
    return {
      success: false,
      reason: "Financial mismatch: Amount or Currency altered.",
    };
  }

  return { success: true, payload };
}
