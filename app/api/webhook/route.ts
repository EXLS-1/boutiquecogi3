import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
// Importation de Prisma client
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

      // Utiliser une transaction pour garantir l'atomicité des opérations
      await prisma.$transaction(async (tx) => {
        // Récupérer les items de la commande pour décrémenter le stock
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      });

        // Vérifier si la commande a déjà été traitée pour éviter les doublons
        if (!order || order.isPaid) {
          // Si déjà traitée, on retourne 200 pour ne pas re-déclencher le webhook
          return new NextResponse("Commande déjà traitée ou inexistante", { status: 200 });
        }

        if (order && order.orderItems.length > 0) {
          // Décrémenter le stock pour chaque produit vendu
          for (const item of order.orderItems) {
            await tx.product.update({ // Utiliser 'tx' pour la transaction
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
        await tx.order.update({ // Utiliser 'tx' pour la transaction
          where: { id: orderId },
          data: {
            isPaid: true,
            // Stocker l'adresse complète pour une meilleure traçabilité
            address: session?.customer_details?.address?.line1 || "", // Exemple: "123 Main St"
            city: session?.customer_details?.address?.city || "",
            country: session?.customer_details?.address?.country || "",
            postalCode: session?.customer_details?.address?.postal_code || "",
          },
        });

        console.log(`✅ Commande ${orderId} payée avec succès !`);
        console.log(`📦 Stock décrémenté pour ${order?.orderItems.length || 0} produit(s)`);
      });

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
