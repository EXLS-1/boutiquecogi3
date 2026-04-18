import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID requis" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      status: session.payment_status,
      paymentStatus: session.payment_status, // completed, unpaid, no_payment_required
      customEmail: session.customer_email,
      total: session.amount_total ? session.amount_total / 100 : 0,
      orderId: session.metadata?.orderId,
    });
  } catch (error: any) {
    console.error("Error retrieving session:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la session" },
      { status: 500 }
    );
  }
}
