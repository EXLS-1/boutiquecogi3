// app/api/auditlog/route.ts

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { recordAuditLog } from "@/server/services/audit.service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAuthorized(provided: string | null): boolean {
  const expected = process.env.AUTH_SECRET;
  if (!expected || !provided) return false;

  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return (
    expectedBytes.length === providedBytes.length &&
    timingSafeEqual(expectedBytes, providedBytes)
  );
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-internal-secret");
  if (!isAuthorized(secret)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body: unknown = await req.json();
    if (!isRecord(body)) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const rawUserId =
      typeof body.userId === "string" ? body.userId.trim() : null;
    const userId = rawUserId && UUID_REGEX.test(rawUserId) ? rawUserId : null;
    const ip = typeof body.ip === "string" && isIP(body.ip) ? body.ip : null;
    const metadata = isRecord(body.metadata) ? body.metadata : undefined;

    const entry = await recordAuditLog({
      userId,
      actorId: userId ?? "rate-limit-service",
      actorType: userId ? "user" : "service_account",
      action:
        typeof body.action === "string" ? body.action : "SECURITY_ALERT",
      targetType: "RATE_LIMIT",
      targetId: ip,
      ipAddress: ip,
      userAgent:
        typeof body.userAgent === "string" ? body.userAgent : undefined,
      metadata,
      details: metadata,
      status: "DENIED",
      severity: undefined,
    });
    if (!entry) {
      return NextResponse.json(
        { success: false, error: "Audit event could not be queued." },
        { status: 503 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[INTERNAL_AUDIT_LOG_ERROR]", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}