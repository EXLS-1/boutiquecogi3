// lib/security/cinetpay-audit.ts
// Module de sécurité & vérification active (Source of Truth) pour CinetPay.
// - Vérification HMAC/Token en temps constant (anti-Timing Attack)
// - Interrogation Server-to-Server directe de l'API /payment/check
//   (ne JAMAIS faire confiance au contenu du webhook entrant)

import { timingSafeEqual } from "node:crypto";
import type { Currency } from "@prisma/client";

export interface CinetPayCheckResponse {
  code: string;
  message: string;
  data?: {
    amount: number;
    currency: Currency;
    status: "ACCEPTED" | "REFUSED" | "CANCELLED" | "PENDING";
    payment_method: string;
    description: string;
    metadata: string | null;
  };
}

/**
 * Compare deux chaînes en temps constant pour prévenir les attaques
 * par analyse temporelle (Timing Attacks).
 *
 * Retourne `false` immédiatement si les longueurs diffèrent (aucune
 * fuite d'information exploitable sur une entrée vide / malformée).
 */
export function verifyHmacToken(receivedToken: string, expectedSecret: string): boolean {
  if (!receivedToken || !expectedSecret) return false;

  const bufReceived = Buffer.from(receivedToken, "utf-8");
  const bufExpected = Buffer.from(expectedSecret, "utf-8");

  if (bufReceived.length !== bufExpected.length) {
    return false;
  }

  return timingSafeEqual(bufReceived, bufExpected);
}

/**
 * Effectue un appel Server-to-Server direct à l'API CinetPay pour vérifier
 * le statut RÉEL de la transaction. C'est la Source of Truth absolue.
 *
 * @throws si l'API CinetPay est injoignable ou renvoie une erreur HTTP.
 */
export async function verifyTransactionWithCinetPay(
  transactionId: string,
  siteId: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<CinetPayCheckResponse> {
  const response = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction_id: transactionId,
      site_id: siteId,
      apikey: apiKey,
    }),
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Erreur API CinetPay Check: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<CinetPayCheckResponse>;
}
