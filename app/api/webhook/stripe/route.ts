import Stripe from "stripe";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { unstable_cacheTag as revalidateTag } from "next/cache";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature")!;

  if (!sig) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (!session.metadata?.orderId) {
          console.error("No orderId in session metadata");
          break;
        }

        const orderId = session.metadata.orderId;

        // Mettre à jour la commande avec les informations de paiement
        await prisma.order.update({
          where: { id: orderId },
          data: {
            isPaid: true,
            status: "PAID",
            stripeSessionId: session.id
          }
        });

        // Réduire les stocks
        const orderItems = await prisma.orderItem.findMany({
          where: { orderId },
          select: { productId: true, quantity: true }
        });

        // Mettre à jour les stocks pour chaque produit
        await prisma.$transaction(
          orderItems.map(item =>
            prisma.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } }
            })
          ),
          { timeout: 10000 }
        );

        // Invalider le cache
        revalidateTag("orders");
        revalidateTag("products");

        console.log(`Order ${orderId} marked as paid, stock updated`);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Trouver la commande associée via la session
        const session = await stripe.checkout.sessions.list({
          payment_intent: paymentIntent.id,
          limit: 1
        });

        if (session.data.length > 0 && session.data[0].metadata?.orderId) {
          const orderId = session.data[0].metadata.orderId;
          
          await prisma.order.update({
            where: { id: orderId },
            data: {
              status: "CANCELLED"
            }
          });

          console.log(`Order ${orderId} marked as cancelled due to payment failure`);
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.metadata?.orderId) {
          await prisma.order.update({
            where: { id: session.metadata.orderId },
            data: {
              status: "CANCELLED"
            }
          });

          console.log(`Order ${session.metadata.orderId} marked as cancelled due to session expiration`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response("Webhook handler failed", { status: 500 });
  }
}