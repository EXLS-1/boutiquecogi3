// app/api/exchange-rate/route.ts

import { NextResponse } from "next/server";
import { getUSDToCDFRate } from "@/lib/exchange-rate/exchange-rate-service";

/**
 * Endpoint public pour récupérer le taux de change actuel.
 * Utilise le service avec cache hiérarchisé.
 */
export async function GET() {
  try {
    const rate = await getUSDToCDFRate();

    return NextResponse.json({
      success: true,
      rate: rate.toString(),
      currency: "CDF",
      base: "USD",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API_EXCHANGE_RATE_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Impossible de récupérer le taux de change" },
      { status: 500 },
    );
  }
}
