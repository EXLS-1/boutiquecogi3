//

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateUUIDv7 } from "@/lib/uuid";

/**
 * Route interne pour l'enregistrement des logs d'audit depuis le Middleware
 */
export async function POST(req: Request) {
  // Sécurisation : on vérifie que l'appel vient bien de notre propre infrastructure
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.AUTH_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const data = await req.json();

    await prisma.auditLog.create({
      data: {
        id: generateUUIDv7(),
        action: data.action || "SECURITY_ALERT",
        entityType: "RATE_LIMIT",
        entityId: data.ip,
        ip: data.ip,
        userAgent: data.userAgent,
        metadata: data.metadata || {},
        createdAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[INTERNAL_AUDIT_LOG_ERROR]", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
