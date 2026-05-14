import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Vérification de la signature IPN (recommandée, voir doc CinetPay)
  if (body.status === "ACCEPTED") {
    const orderId = body.transaction_id;
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "PAID" },
    });
  }
  return NextResponse.json({ success: true });
}