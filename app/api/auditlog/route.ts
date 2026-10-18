// app/api/auditlog/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateUUIDv7 } from "@/lib/utils/uuid";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.AUTH_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const data = await req.json();

    // `audit_log.userId` est une clé étrangère obligatoire pour le client
    // Prisma généré (colonne @db.Uuid) : une entrée n'est écrite que lorsqu'un
    // acteur réel et valide est fourni. Les alertes anonymes sont ignorées
    // proprement (warn) au lieu de faire échouer la création en base.
    const rawUserId = typeof data.userId === "string" ? data.userId.trim() : null;
    const userId = rawUserId && UUID_REGEX.test(rawUserId) ? rawUserId : null;
    if (!userId) {
      console.warn(
        "[INTERNAL_AUDIT_LOG] Entrée ignorée : aucun acteur (userId UUID) fourni.",
      );
      return NextResponse.json({ success: true });
    }

    await prisma.auditLog.create({
      data: {
        id: generateUUIDv7(),
        userId,
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