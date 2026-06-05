// app/api/webhook/cinetpay/route.ts
// Ce fichier gère la route POST /api/webhooks/cinetpay pour traiter les notifications de paiement de CinetPay.
// Il valide la signature HMAC, vérifie l'existence de la commande, met à jour son statut (CONFIRMED) et ajuste l'inventaire.

import { NextRequest, NextResponse } from "next/server";
import {
  executeIdempotent,
  buildWebhookIdempotencyKey,
} from "@/lib/idempotency";
import { verifyCinetPaySignature } from "@/lib/cinetpay"; // À implémenter : vérifie le hash HMAC
import { v7 as uuidv7 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-token");

    // 1. Validation de signature HMAC
    if (!signature || !verifyCinetPaySignature(signature, body)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // CinetPay envoie les données en urlencoded ou JSON selon la configuration, ici on suppose JSON
    const payload = JSON.parse(body);
    const { cpm_trans_id, cpm_site_id, cpm_custom, cpm_amount, cpm_currency } =
      payload; // Destructuration des données du payload

    // 2. Exécution Idempotente via la table IdempotencyKey
    const result = await executeIdempotent(
      {
        scope: "WEBHOOK",
        key: buildWebhookIdempotencyKey("cinetpay", cpm_trans_id),
        method: "POST",
        route: "/api/webhook/cinetpay",
        requestBody: payload,
      },
      async (tx) => {
        // A. Vérification de la commande d'origine (cpm_custom contient l'ID de commande)
        const order = await tx.order.findUnique({
          where: { id: cpm_custom },
          include: { items: true },
        });

        if (!order) throw new Error(`Order ${cpm_custom} not found`);
        if (order.status !== "PENDING") return { status: "processed" };

        // B. Double vérification Server-to-Server (Anti-Spoofing)
        const cinetpayModule = (await import("@/lib/cinetpay")) as any;
        const cinetpayStatus =
          await cinetpayModule.checkCinetPayTransactionStatus(cpm_trans_id);

        if (cinetpayStatus !== "ACCEPTED") {
          throw new Error(`CinetPay Transaction failed: ${cinetpayStatus}`);
        }

        // C. Mise à jour de la commande vers CONFIRMED (V1)
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "CONFIRMED",
            updatedAt: new Date(),
          },
        });

        // D. Enregistrement Ledger du stock (SALE)
        for (const item of order.items) {
          await tx.inventoryTransaction.create({
            data: {
              id: uuidv7(),
              // Use relation connect in case the scalar FK name differs in the schema
              productVariant: { connect: { id: item.productVariantId } },
              quantity: -item.quantity,
              type: "SALE",
              reference: `ORDER_${order.orderNumber}`,
            },
          });
        }

        return { status: "success", orderId: order.id };
        // --- FIN LOGIQUE METIER ---
      },
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // 3. Réponse 200 OK (CinetPay a besoin de ce succès pour arrêter les retries)
    return NextResponse.json(
      {
        success: true,
        fromCache: result.ok ? result.fromCache : false,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[CINETPAY_WEBHOOK_ERROR]", error);
    // On retourne 500 pour que CinetPay retente plus tard
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
