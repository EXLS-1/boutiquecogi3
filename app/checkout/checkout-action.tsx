"use server";

import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

export const checkoutAction = async (formData: FormData): Promise<void> => {
  const session = await getServerSession();

  if (!session || !(session.user as any)?.id) {
    redirect("/login?callbackUrl=/checkout");
  }

  const userId = (session.user as any).id;

  const itemsJson = formData.get("items") as string;
  const items: CartItem[] = JSON.parse(itemsJson);

  if (!items || items.length === 0) {
    throw new Error("Panier vide");
  }

  // Créer la commande en base de données
  const order = await prisma.order.create({
    data: {
      userId,
      totalAmount: items.reduce((acc, item) => acc + item.price * item.quantity, 0),
      orderItems: {
        create: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          price: Math.round(item.price * 100),
          product: { connect: { id: item.id } },
        })),
      },
    },
  });

  // Créer les ligne d'articles pour Stripe
  const line_items = items.map((item: CartItem) => ({
    price_data: {
      currency: "xof",
      product_data: { 
        name: item.name,
        images: [item.image],
      },
      unit_amount: Math.round(item.price),
    },
    quantity: item.quantity,
  }));

  // Créer la session Stripe avec l'orderId en metadata
  const stripeSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items,
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout`,
    metadata: {
      orderId: order.id,
    },
  });

  redirect(stripeSession.url!);
};
