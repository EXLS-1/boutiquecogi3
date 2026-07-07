// app/api/proxy/dashboard/route.ts
// Proxy API pour les appels dashboard — vérifie le niveau avant toute opération
// Utilisé par les widgets qui font des fetch côté client

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
// prisma import removed: not used in this route

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userLevel = ((session.user as { level?: number })?.level ?? 6);

  // BLOCAGE LEVEL 6
  if (userLevel >= 6) {
    return NextResponse.json(
      { error: "Forbidden", code: "403_FORBIDDEN" },
      { status: 403 },
    );
  }

  // Traitement normal pour les niveaux 1-5
  // ...
}
