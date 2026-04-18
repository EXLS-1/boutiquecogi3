import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, email, userId } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Panier vide" },
        { status: 400 }
      );
    }

    // Créer la commande en base de données
    const order = await prisma.order.create({
      data: {
        userId: userId || "guest",
        total: items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0),
        items: {
          create: items.map((item: any) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        },
      },
    });

    // Créer les line items pour Stripe
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: "xof", // XOF pour CFA Franc
        product_data: {
          name: item.name,
          description: item.description || "",
          images: [item.image] || [],
        },
        unit_amount: Math.round(item.price * 100), // Conversion en centimes (xof)
      },
      quantity: item.quantity,
    }));

    // Créer la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/checkout`,
      customer_email: email,
      metadata: {
        orderId: order.id,
      },
    });

    return NextResponse.json({ sessionId: session.id, clientSecret: session.client_secret });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la création de la session de paiement" },
      { status: 500 }
    );
  }
}
