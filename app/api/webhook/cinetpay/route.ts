import { NextResponse } from "next/server";
import {
  executeIdempotent,
  buildWebhookIdempotencyKey,
} from "@/lib/idempotency";
import { verifyCinetPaySignature } from "@/lib/cinetpay"; // À implémenter : vérifie le hash HMAC
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-token");

    // 1. Validation de sécurité stricte (Fail Fast)
    if (!signature || !verifyCinetPaySignature(signature, body)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // CinetPay envoie les données en urlencoded ou JSON selon la configuration
    const payload = JSON.parse(body);
    const { cpm_trans_id, cpm_site_id, cpm_custom, cpm_amount, cpm_currency } =
      payload;

    // 2. Exécution Idempotente et Atomique
    const result = await executeIdempotent(
      {
        scope: "WEBHOOK",
        key: buildWebhookIdempotencyKey("cinetpay", cpm_trans_id),
        method: "POST",
        route: "/api/webhooks/cinetpay",
        requestBody: payload,
      },
      async (tx) => {
        // --- DEBUT LOGIQUE METIER (Exécutée dans la transaction) ---

        // A. Vérification de la commande d'origine
        const order = await tx.order.findUnique({
          where: { id: cpm_custom }, // cpm_custom stocke généralement l'order_id
          include: { items: true },
        });

        if (!order) throw new Error(`Order ${cpm_custom} not found`);
        if (order.status === "PAID") return { status: "already_paid" }; // Sécurité secondaire

        // B. Appel à l'API CinetPay pour vérifier le statut réel (Anti-Spoofing)
        // Note: Idéalement, cet appel réseau externe devrait se faire AVANT executeIdempotent
        // pour ne pas bloquer la transaction, mais pour l'exemple, on vérifie l'état localement.

        // C. Mise à jour de la commande
        await tx.order.update({
          where: { id: order.id },
          data: { status: "PAID", paymentId: cpm_trans_id },
        });

        // D. Libération de la réservation d'inventaire et déduction du stock réel
        // C'est ici que l'atomicité sauve ton e-commerce.
        for (const item of order.items) {
          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              quantity: -item.quantity,
              type: "SALE",
              orderId: order.id,
            },
          });
          // Logique de mise à jour du snapshot de l'inventaire ici...
        }

        return { status: "success", orderId: order.id };
        // --- FIN LOGIQUE METIER ---
      },
    );

    // 3. Réponse (CinetPay exige un 200 OK rapide)
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
