import { NextRequest, NextResponse } from "next/server";
import type { CinetPayWebhookBody } from "@/lib/cinetpay/types";
import { confirmOrderPayment } from "@/lib/services/order.service";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CinetPayWebhookBody;
    const transactionId =
      body.cpm_trans_id || body.transaction_id || body.cpm_custom;

    const isAccepted =
      body.cpm_result === "00" ||
      body.cpm_trans_status === "ACCEPTED" ||
      body.status === "ACCEPTED";

    if (!transactionId || !isAccepted) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const order = await confirmOrderPayment(transactionId);

    if (!order) {
      return NextResponse.json(
        { error: "Commande introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error("[cinetpay webhook]", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
