// app/api/cron/exchange-rate/route.ts
// Ce fichier définit une route API Next.js pour exécuter la tâche cron de mise à jour du taux de change USD/CDF.
// La route est protégée par un token d'authentification pour éviter les abus et les attaques.
// Lorsqu'elle est appelée, elle déclenche la fonction updateExchangeRateCronJob qui tente de récupérer le taux depuis la BCC et de le persister.
// La réponse JSON indique le succès ou l'échec de l'opération, avec des logs détaillés pour faciliter le monitoring.

import { NextResponse } from "next/server";
import { updateExchangeRateCronJob } from "@/lib/exchange-rate/exchange-rate-cron";

// Force Next.js to treat this route as dynamic, preventing caching issues.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  // Protection critique : Empêcher le public de vider ton quota d'API ou de DDOS la BCC
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const success = await updateExchangeRateCronJob();

    return NextResponse.json(
      {
        success,
        timestamp: new Date().toISOString(),
        execution: success ? "completed" : "failed_fallback_active",
      },
      { status: success ? 200 : 502 },
    );
  } catch (error) {
    console.error("[CRON_ROUTE_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Erreur interne lors de l'exécution du cron" },
      { status: 500 },
    );
  }
}
