import { NextResponse } from "next/server";
import { getFastUSDToCDFRate } from "@/lib/exchange-rate/exchange-rate-service";

// Force la route à être dynamique pour éviter le gel des données au build
export const dynamic = "force-dynamic";

/**
 * Endpoint public pour récupérer le taux de change actuel.
 * Optimisé pour des performances maximales (< 50ms) via lecture exclusive des caches.
 */
export async function GET() {
  try {
    // Utilisation de la stratégie de lecture seule pour protéger le client de la lenteur de la BCC
    const rate = await getFastUSDToCDFRate();

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
