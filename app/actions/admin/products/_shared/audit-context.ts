// app/actions/admin/products/_shared/audit-context.ts
// ═════════════════════════════════════════════════════════════════════════════
// SHARED — Build audit context for product actions
// ═════════════════════════════════════════════════════════════════════════════

import { headers } from "next/headers";

export interface AuditContext {
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: Date;
}

export async function buildAuditContext(
  action: string,
  resourceType: string,
  resourceId: string
): Promise<AuditContext> {
  const headersList = await headers();

  return {
    ipAddress: headersList.get("x-forwarded-for") || "unknown",
    userAgent: headersList.get("user-agent") || "unknown",
    sessionId: headersList.get("x-session-id") || "unknown",
    action,
    resourceType,
    resourceId,
    timestamp: new Date(),
  };
}