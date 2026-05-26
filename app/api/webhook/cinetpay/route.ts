// app/api/webhook/cinetpay/route.ts
// Ce fichier gère la route POST /api/webhooks/cinetpay pour traiter les notifications de paiement de CinetPay.
// Il valide la signature HMAC, vérifie l'existence de la commande, met à jour son statut et ajuste l'inventaire de manière atomique et idempotente.
import { NextRequest, NextResponse } from "next/server";
import {
  executeIdempotent,
  buildWebhookIdempotencyKey,
} from "@/lib/idempotency";
import {
  verifyCinetPaySignature,
  checkCinetPayTransactionStatus,
} from "@/lib/cinetpay"; // À implémenter : vérifie le hash HMAC

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-token");

    // 1. Validation de sécurité stricte (Fail Fast)
    if (!signature || !verifyCinetPaySignature(signature, body)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // CinetPay envoie les données en urlencoded ou JSON selon la configuration, ici on suppose JSON
    const payload = JSON.parse(body);
    const { cpm_trans_id, cpm_site_id, cpm_custom, cpm_amount, cpm_currency } =
      payload; // Destructuration des données du payload

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
          include: { items: { include: { product: true } } },
        });

        if (!order) throw new Error(`Order ${cpm_custom} not found`);
        if (order.status === "PAID") return { status: "already_paid" }; // Sécurité secondaire

        // B. Appel à l'API CinetPay pour vérifier le statut réel (Anti-Spoofing)
        const cinetpayStatus =
          await checkCinetPayTransactionStatus(cpm_trans_id);
        if (cinetpayStatus !== "ACCEPTED") {
          // Si le statut CinetPay n'est pas "ACCEPTED", on annule la transaction
          // ou on marque la commande comme échouée/en attente.
          // Pour cet exemple, nous allons simplement lancer une erreur pour annuler la transaction et la marquer comme échouée.
          throw new Error(
            `CinetPay transaction ${cpm_trans_id} status is not ACCEPTED: ${cinetpayStatus}`,
          );
        }

        // C. Mise à jour de la commande
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "PAID",
            paymentId: cpm_trans_id,
            paymentMethod: "CinetPay",
            paidAt: new Date(),
          },
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
          // Décrémenter le stock réel du produit (si le stock est géré au niveau du produit)
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { decrement: item.quantity },
            },
          });
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
