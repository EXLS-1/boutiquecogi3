// lib/services/payment-processor.ts
// Pipeline Anti-Relecture & Traitement Atomique du webhook CinetPay.
//
// 4 verrous d'étanchéité :
//   1. Vérification d'empreinte (HMAC/Token) — comparaison en temps constant.
//   2. Idempotence atomique en BDD (contrainte UNIQUE sur transactionId).
//   3. Double vérification active Server-to-Server auprès de l'API CinetPay.
//   4. Validation stricte de la cohérence de la commande (montant, devise).
//
// Une notification déjà traitée est rejetée sans altérer la BDD ni ré-exécuter
// la commande (Replay Attack intercepté).

import { prisma } from "@/lib/prisma";
import { cinetPayWebhookSchema } from "@/lib/validations/cinetpay";
import {
  verifyHmacToken,
  verifyTransactionWithCinetPay,
} from "@/lib/security/cinetpay-audit";
import { PaymentAuditStatus, OrderStatusEnum, PaymentStatus } from "@prisma/client";

const WEBHOOK_TIMEOUT_MS = 15_000; // 15s max pour le S2S check

export interface PaymentProcessorResult {
  status: number;
  message: string;
  replayBlocked?: boolean;
}

/**
 * Traite une notification webhook CinetPay de manière atomique et idempotente.
 */
export async function processCinetPayWebhook(
  rawBody: unknown,
  headers: Headers,
  clientIp: string
): Promise<PaymentProcessorResult> {
  // ── 1. Validation de la structure du payload ─────────────────────────────
  const parseResult = cinetPayWebhookSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return { status: 400, message: "Payload webhook invalide" };
  }

  const payload = parseResult.data;
  const transactionId = payload.cpm_trans_id;

  // ── 2. Vérification du jeton X-Token / HMAC (anti-Timing Attack) ─────────
  const xToken = headers.get("x-token") || headers.get("cpm-site-id");
  const secretKey = process.env.CINETPAY_WEBHOOK_SECRET;

  if (xToken && secretKey && !verifyHmacToken(xToken, secretKey)) {
    console.warn(`[SECURITY_ALERT] Jeton HMAC/x-token invalide pour TX ${transactionId}`);
    return { status: 403, message: "Signature invalide" };
  }

  // ── 3. Détection de Replay Attack via l'idempotence en BDD ───────────────
  const existingAudit = await prisma.paymentAuditLog.findUnique({
    where: { transactionId },
  });

  if (existingAudit) {
    if (existingAudit.status === PaymentAuditStatus.SUCCESS) {
      console.warn(`[REPLAY_ATTACK_BLOCKED] Relecture détectée pour transaction ${transactionId}`);
      // 200 = stoppe les renvois de CinetPay, MAIS aucun traitement métier n'est exécuté.
      return { status: 200, message: "Transaction déjà traitée (Replay intercepté)", replayBlocked: true };
    }

    if (existingAudit.status === PaymentAuditStatus.PENDING) {
      return { status: 429, message: "Transaction en cours de traitement simultané" };
    }
  }

  // ── 4. Inscription initiale de l'audit en état PENDING (verrou atomique) ─
  await prisma.paymentAuditLog.upsert({
    where: { transactionId },
    create: {
      transactionId,
      orderId: payload.cpm_custom || "UNKNOWN",
      amount: payload.cpm_amount,
      currency: payload.cpm_currency,
      status: PaymentAuditStatus.PENDING,
      ipAddress: clientIp,
      rawPayload: rawBody as object,
    },
    update: {}, // Ne rien faire si déjà existant (race condition gérée par UNIQUE)
  });

  try {
    // ── 5. Interrogation directe de l'API CinetPay (Source of Truth) ───────
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    let verification;
    try {
      verification = await verifyTransactionWithCinetPay(
        transactionId,
        payload.cpm_site_id,
        process.env.CINETPAY_API_KEY!,
        controller.signal
      );
    } finally {
      clearTimeout(timeout);
    }

    if (verification.code !== "00" || verification.data?.status !== "ACCEPTED") {
      await prisma.paymentAuditLog.update({
        where: { transactionId },
        data: {
          status: PaymentAuditStatus.FAILED,
          cinetpayCode: verification.code,
          failureReason: verification.message || "Paiement non validé par CinetPay",
          processedAt: new Date(),
        },
      });
      return { status: 400, message: "Paiement non confirmé par l'opérateur" };
    }

    const verifiedData = verification.data;

    // ── 6. Transaction atomique Prisma : vérif commande + maj statuts ──────
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: payload.cpm_custom },
        include: { payment: true },
      });

      if (!order) {
        throw new Error(`Commande introuvable ID: ${payload.cpm_custom}`);
      }

      // Vérification stricte des montants (prévention de falsification de prix)
      const orderAmount = Number(order.totalAmount);
      const paidAmount = Number(verifiedData.amount);
      const currencyMatch =
        order.currency.toUpperCase() === verifiedData.currency.toUpperCase();

      if (Math.abs(orderAmount - paidAmount) > 0.01 || !currencyMatch) {
        await tx.paymentAuditLog.update({
          where: { transactionId },
          data: {
            status: PaymentAuditStatus.AMOUNT_MISMATCH,
            failureReason: `Incohérence montant. BDD: ${orderAmount} ${order.currency} vs CinetPay: ${paidAmount} ${verifiedData.currency}`,
            processedAt: new Date(),
          },
        });
        throw new Error("Alerte de sécurité : Le montant payé ne correspond pas à la commande.");
      }

      // Validation finale de la commande
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatusEnum.CONFIRMED,
          cinetpayTransId: transactionId,
          paidAt: new Date(),
        },
      });

      // Mise à jour du paiement associé
      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: {
            status: PaymentStatus.COMPLETED,
            transactionId,
            paidAt: new Date(),
          },
        });
      }

      // Clôture de l'audit en SUCCESS
      await tx.paymentAuditLog.update({
        where: { transactionId },
        data: {
          status: PaymentAuditStatus.SUCCESS,
          cinetpayCode: verification.code,
          processedAt: new Date(),
        },
      });
    });

    return { status: 200, message: "Paiement validé et traité avec succès" };

  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";

    await prisma.paymentAuditLog.update({
      where: { transactionId },
      data: {
        status: PaymentAuditStatus.FAILED,
        failureReason: message,
        processedAt: new Date(),
      },
    });

    return { status: 500, message: `Échec du traitement : ${message}` };
  }
}
