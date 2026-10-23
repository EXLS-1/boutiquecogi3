import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processAuditOutboxBatch } from "@/server/services/audit-outbox-worker";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(authorization: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authorization?.startsWith("Bearer ")) return false;

  const supplied = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

async function handleRequest(request: Request): Promise<NextResponse> {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "Audit outbox worker is not configured." },
      { status: 503 },
    );
  }
  if (!isAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await processAuditOutboxBatch();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[AUDIT_OUTBOX_WORKER_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Audit outbox processing failed." },
      { status: 500 },
    );
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
