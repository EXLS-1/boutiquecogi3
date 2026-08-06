// app/api/webhook/cinetpay/route.ts
// Route POST /api/webhook/cinetpay — Traitement des notifications CinetPay.
//
// Architecture anti-replay (4 verrous) :
//   1. Vérification HMAC du body brut (anti-spoofing) en temps constant.
//   2. Idempotence atomique via PaymentAuditLog (UNIQUE transactionId).
//   3. Double vérification Server-to-Server auprès de l'API CinetPay.
//   4. Validation stricte montant/devise dans la transaction Prisma.
//
// Le pipeline métier est délégué à `processCinetPayWebhook`.

import { NextRequest, NextResponse } from "next/server";
import { verifyCinetPaySignature } from "@/lib/cinetpay";
import { processCinetPayWebhook } from "@/lib/services/payment-processor";

const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID;

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
  console[level](JSON.stringify(entry));
}

export async function POST(req: NextRequest) {
  const requestStart = Date.now();
  let rawBody = "";
  const transactionId = "unknown";

  try {
    // 1. Lecture du body brut (pour HMAC)
    rawBody = await req.text();
    const signature = req.headers.get("x-token");
    const clientIp = req.headers.get("x-forwarded-for") || "0.0.0.0";

    // 2. Vérification HMAC du body (anti-spoofing, temps constant)
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

    // 4. Anti cross-merchant : vérifier le site_id
    const typed = payload as Record<string, unknown>;
    if (typed.cpm_site_id && typed.cpm_site_id !== CINETPAY_SITE_ID) {
      logWebhook("warn", String(typed.cpm_trans_id ?? "unknown"), "Site ID mismatch", {
        received: typed.cpm_site_id,
        expected: CINETPAY_SITE_ID,
      });
      return NextResponse.json(
        { error: "Invalid site ID" },
        { status: 403 }
      );
    }

    // 5. Délégation au pipeline anti-replay (validation, idempotence,
    //    S2S check, cohérence montant/devise, audit)
    const result = await processCinetPayWebhook(payload, req.headers, clientIp);

    if (result.replayBlocked) {
      logWebhook("warn", String(typed.cpm_trans_id ?? "unknown"), result.message);
    }

    return NextResponse.json(
      { message: result.message },
      { status: result.status }
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
