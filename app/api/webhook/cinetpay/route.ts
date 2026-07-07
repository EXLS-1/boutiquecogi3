// app/api/webhook/cinetpay/route.ts
// Route POST /api/webhook/cinetpay — Traitement des notifications CinetPay
// Priorités: atomicité, idempotence, anti-spoofing, validation exhaustive, traçabilité

import { NextRequest, NextResponse } from "next/server";
import {
  executeIdempotent,
  buildWebhookIdempotencyKey,
} from "@/lib/idempotency";
import {
  verifyCinetPaySignature,
  checkCinetPayTransactionStatus,
} from "@/lib/cinetpay";
import { generateUUIDv7 } from "@/lib/uuid";

// ─── Types CinetPay Webhook ─────────────────────────────────────────────

interface CinetPayWebhookPayload {
  cpm_trans_id: string;
  cpm_site_id: string;
  cpm_custom: string;      // order.id
  cpm_amount: string;      // CinetPay envoie en string
  cpm_currency: string;
  cpm_payment_date?: string;
  cpm_error_message?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────

const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID;
const WEBHOOK_TIMEOUT_MS = 15_000; // 15s max pour le S2S check

// ─── Helpers ────────────────────────────────────────────────────────────

function isValidPayload(payload: unknown): payload is CinetPayWebhookPayload {
  if (typeof payload !== "object" || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.cpm_trans_id === "string" &&
    p.cpm_trans_id.length > 0 &&
    typeof p.cpm_site_id === "string" &&
    p.cpm_site_id.length > 0 &&
    typeof p.cpm_custom === "string" &&
    p.cpm_custom.length > 0 &&
    typeof p.cpm_amount === "string" &&
    !isNaN(Number(p.cpm_amount)) &&
    Number(p.cpm_amount) >= 0 &&
    typeof p.cpm_currency === "string" &&
    p.cpm_currency.length === 3 // ISO 4217
  );
}

function logWebhook(
  level: "info" | "warn" | "error",
  transId: string,
  message: string,
  meta?: Record<string, unknown>
) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    source: "CINETPAY_WEBHOOK",
    transactionId: transId,
    message,
    ...meta,
  };
  // Adapter selon votre logger (Pino, Winston, etc.)
  console[level](JSON.stringify(entry));
}

// ─── Route Handler ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const requestStart = Date.now();
  let rawBody = "";
  let transactionId = "unknown";

  try {
    // 1. Lecture du body brut (pour HMAC)
    rawBody = await req.text();
    const signature = req.headers.get("x-token");

    // 2. Validation HMAC
    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature header" },
        { status: 401 }
      );
    }

    if (!verifyCinetPaySignature(signature, rawBody)) {
      logWebhook("warn", "unknown", "Invalid HMAC signature", {
        signaturePrefix: signature.slice(0, 8) + "...",
      });
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // 3. Parsing JSON avec garde-fou
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      logWebhook("warn", "unknown", "Malformed JSON body");
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // 4. Validation du schéma du payload
    if (!isValidPayload(payload)) {
      logWebhook("warn", "unknown", "Payload schema validation failed", {
        payloadKeys: Object.keys(payload as object),
      });
      return NextResponse.json(
        { error: "Invalid payload schema" },
        { status: 400 }
      );
    }

    const { cpm_trans_id, cpm_site_id, cpm_custom, cpm_amount, cpm_currency } =
      payload;
    transactionId = cpm_trans_id;

    // 5. Vérification du site_id (anti-cross-merchant)
    if (cpm_site_id !== CINETPAY_SITE_ID) {
      logWebhook("warn", transactionId, "Site ID mismatch", {
        received: cpm_site_id,
        expected: CINETPAY_SITE_ID,
      });
      return NextResponse.json(
        { error: "Invalid site ID" },
        { status: 403 }
      );
    }

    // 6. Exécution idempotente
    const result = await executeIdempotent(
      {
        scope: "WEBHOOK",
        key: buildWebhookIdempotencyKey("cinetpay", cpm_trans_id),
        method: "POST",
        route: "/api/webhook/cinetpay",
        requestBody: payload,
      },
      async (tx) => {
        // ── A. Récupération de la commande ─────────────────────────────
        const order = await tx.order.findUnique({
          where: { id: cpm_custom },
          include: {
            items: {
              include: {
                variant: {
                  include: { inventoryTransactions: true }, // Pour vérifier doublon stock
                },
              },
            },
          },
        });

        if (!order) {
          // 404 = pas de retry CinetPay (la commande n'existe vraiment pas)
          throw Object.assign(new Error(`Order ${cpm_custom} not found`), {
            statusCode: 404,
            isClientError: true,
          });
        }

        // Si déjà traitée, retourner succès immédiatement
        if (order.status === "CONFIRMED") {
          return { status: "already_confirmed", orderId: order.id };
        }
        if (order.status !== "PENDING") {
          return { status: "not_pending", currentStatus: order.status };
        }

        // ── B. Vérification montant / devise (anti-tampering) ──────────
        const webhookAmount = Number(cpm_amount);
        const orderAmount = Number(order.totalAmount);
        const currencyMatch =
          order.currency?.toUpperCase() === cpm_currency.toUpperCase();

        if (Math.abs(webhookAmount - orderAmount) > 0.01 || !currencyMatch) {
          logWebhook("error", transactionId, "Amount/currency mismatch", {
            webhookAmount,
            orderAmount,
            webhookCurrency: cpm_currency,
            orderCurrency: order.currency,
          });
          throw Object.assign(
            new Error(
              `Payment mismatch: expected ${orderAmount} ${order.currency}, got ${webhookAmount} ${cpm_currency}`
            ),
            { statusCode: 400, isClientError: true }
          );
        }

        // ── C. Vérification Server-to-Server (avec timeout) ───────────
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

        let cinetpayStatus: string;
        try {
          cinetpayStatus = await checkCinetPayTransactionStatus(
            cpm_trans_id,
            controller.signal
          );
        } finally {
          clearTimeout(timeout);
        }

        if (cinetpayStatus !== "ACCEPTED") {
          throw Object.assign(
            new Error(`CinetPay transaction rejected: ${cinetpayStatus}`),
            { statusCode: 400, isClientError: true }
          );
        }

        // ── D. Mise à jour commande → CONFIRMED ────────────────────────
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "CONFIRMED",
            paymentMethod: "CINETPAY",
            paymentTransactionId: cpm_trans_id,
            paidAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // ── E. Décrémentation stock (avec garde anti-doublon) ──────────
        for (const item of order.items) {
          const variant = item.variant;
          if (!variant?.id) {
            throw Object.assign(
              new Error(`Missing product variant for item ${item.id}`),
              { statusCode: 500, isClientError: false }
            );
          }

          // Vérifier qu'on n'a pas déjà un ledger pour cette commande
          const alreadyRecorded = variant.inventoryTransactions.some(
            (t) => t.referenceId === `ORDER_${order.orderNumber}`
          );
          if (alreadyRecorded) {
            logWebhook(
              "warn",
              transactionId,
              `Inventory already recorded for item ${variant.id}`
            );
            continue;
          }

          await tx.inventoryTransaction.create({
            data: {
              id: generateUUIDv7(),
              productVariantId: variant.id,
              quantity: -Math.abs(item.quantity), // Toujours négatif, jamais positif
              type: "SALE",
              referenceId: `ORDER_${order.orderNumber}`,
              metadata: {
                orderId: order.id,
                transactionId: cpm_trans_id,
                amount: cpm_amount,
                currency: cpm_currency,
              },
            },
          });
        }

        logWebhook("info", transactionId, "Order confirmed and inventory updated", {
          orderId: order.id,
          orderNumber: order.orderNumber,
          itemCount: order.items.length,
        });

        return { status: "success", orderId: order.id };
      }
    );

    // 7. Gestion du résultat idempotent
    if (!result.ok) {
      const statusCode = (result.error as { statusCode?: number })?.statusCode ?? 400;
      const isClientError = (result.error as { isClientError?: boolean })?.isClientError ?? false;

      logWebhook(
        isClientError ? "warn" : "error",
        transactionId,
        "Idempotent execution failed",
        { error: String(result.error), statusCode }
      );

      return NextResponse.json(
        { error: String(result.error) },
        { status: isClientError ? statusCode : 500 }
      );
    }

    // 8. Réponse 200 OK (CinetPay arrête les retries)
    return NextResponse.json(
      {
        success: true,
        fromCache: result.fromCache,
        orderId: (result.data as { orderId?: string } | undefined)?.orderId,
      },

      { status: 200 }
    );

  } catch (error) {
    const duration = Date.now() - requestStart;
    logWebhook("error", transactionId, "Unhandled webhook error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      durationMs: duration,
    });

    // 500 = CinetPay va retry (comportement souhaité pour erreurs serveur)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
