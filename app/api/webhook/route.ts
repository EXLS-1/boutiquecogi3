import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.text(); // Stripe envoie un body brut (raw)
  const signature = (await headers()).get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    // On vérifie que le message vient bien de Stripe et n'a pas été falsifié
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error("Webhook signature verification failed:", error.message);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  try {
    // L'événement qui nous intéresse : le paiement est complété
    if (event.type === "checkout.session.completed") {
      const orderId = session?.metadata?.orderId;

      if (!orderId) {
        console.error("OrderId manquant dans les metadata");
        return new NextResponse("OrderId manquant dans les metadata", {
          status: 400,
        });
      }

      // Récupérer les items de la commande pour décrémenter le stock
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (order && order.items.length > 0) {
        // Décrémenter le stock pour chaque produit vendu
        for (const item of order.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      // Mise à jour de la commande en base de données
      await prisma.order.update({
        where: { id: orderId },
        data: {
          isPaid: true,
          address: session?.customer_details?.address?.line1 || "",
        },
      });

      console.log(`✅ Commande ${orderId} payée avec succès !`);
      console.log(`📦 Stock décrémenté pour ${order?.items.length || 0} produit(s)`);
    }

    // Événement : le client a oublié de payer
    if (event.type === "checkout.session.expired") {
      const orderId = session?.metadata?.orderId;

      if (orderId) {
        console.log(`⚠️ Session de paiement expirée pour la commande ${orderId}`);
        // Optionnel : Supprimer ou marquer la commande comme expirée
      }
    }

    return new NextResponse(null, { status: 200 });
  } catch (error: any) {
    console.error("Error processing webhook event:", error);
    return new NextResponse(`Processing Error: ${error.message}`, {
      status: 500,
    });
  }
}
