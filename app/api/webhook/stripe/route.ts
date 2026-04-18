import Stripe from "stripe";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { revalidateTag } from "next/cache";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    await prisma.order.update({
      where: { stripeSessionId: session.id },
      data: { isPaid: true },
    });

    revalidateTag("orders");
  }

  return new Response("OK");
}