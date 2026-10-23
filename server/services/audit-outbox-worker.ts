import { prisma } from "@/lib/prisma";
import { parseAuditOutboxPayload } from "./audit-outbox";

const MAX_ATTEMPTS = 12;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const BATCH_SIZE = 50;

export interface AuditOutboxBatchResult {
  claimed: number;
  processed: number;
  retried: number;
  deadLettered: number;
}

export async function processAuditOutboxBatch(): Promise<AuditOutboxBatchResult> {
  const now = new Date();
  const staleLockBefore = new Date(now.getTime() - LOCK_TIMEOUT_MS);
  const entries = await prisma.auditOutbox.findMany({
    where: {
      processedAt: null,
      failedAt: null,
      nextAttemptAt: { lte: now },
      OR: [{ lockedAt: null }, { lockedAt: { lt: staleLockBefore } }],
    },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
    select: { id: true, payload: true, attempts: true },
  });

  const result: AuditOutboxBatchResult = {
    claimed: 0,
    processed: 0,
    retried: 0,
    deadLettered: 0,
  };

  if (entries.length > 0) {
    await prisma.$queryRaw`SELECT public.ensure_audit_log_partitions(3)`;
  }

  for (const entry of entries) {
    const claimed = await prisma.auditOutbox.updateMany({
      where: {
        id: entry.id,
        processedAt: null,
        failedAt: null,
        nextAttemptAt: { lte: now },
        OR: [{ lockedAt: null }, { lockedAt: { lt: staleLockBefore } }],
      },
      data: { lockedAt: now, attempts: { increment: 1 } },
    });
    if (claimed.count !== 1) continue;
    result.claimed += 1;

    try {
      const payload = parseAuditOutboxPayload(entry.payload);
      if (!payload) {
        throw new Error("Invalid audit outbox payload.");
      }

      const existingLog = await prisma.auditLog.findFirst({
        where: { id: entry.id },
        select: { id: true },
      });

      if (!existingLog) {
        await prisma.auditLog.create({
          data: {
            id: entry.id,
            createdAt: new Date(payload.createdAt),
            updatedAt: new Date(payload.createdAt),
            userId: payload.userId,
            actorId: payload.actorId,
            actorType: payload.actorType,
            impersonatedBy: payload.impersonatedBy,
            roleLevel: payload.roleLevel,
            action: payload.action,
            targetId: payload.targetId,
            targetType: payload.targetType,
            entityId: payload.entityId,
            resourceType: payload.resourceType,
            resourceId: payload.resourceId,
            actorName: payload.actorName,
            actorEmail: payload.actorEmail,
            severity: payload.severity,
            status: payload.status,
            ...(payload.oldValue !== undefined
              ? { oldValue: payload.oldValue }
              : {}),
            ...(payload.newValue !== undefined
              ? { newValue: payload.newValue }
              : {}),
            ...(payload.metadata !== undefined
              ? { metadata: payload.metadata }
              : {}),
            ...(payload.metadata !== undefined
              ? { payload: payload.metadata }
              : {}),
            details: payload.details,
            ipAddress: payload.ipAddress,
            userAgent: payload.userAgent,
            browser: payload.browser,
            os: payload.os,
            device: payload.device,
            sessionId: payload.sessionId,
            traceId: payload.traceId,
            reason: payload.reason,
            error: payload.error,
            errorCode: payload.errorCode,
          },
        });
      }

      await prisma.auditOutbox.update({
        where: { id: entry.id },
        data: { processedAt: new Date(), lockedAt: null, lastError: null },
      });
      result.processed += 1;
    } catch (error) {
      const attempts = entry.attempts + 1;
      const deadLetter = attempts >= MAX_ATTEMPTS;
      const backoffMs = Math.min(60 * 60 * 1000, 1000 * 2 ** attempts);
      const message =
        error instanceof Error ? error.message : "Unknown audit outbox error";

      try {
        await prisma.auditOutbox.update({
          where: { id: entry.id },
          data: {
            lockedAt: null,
            failedAt: deadLetter ? new Date() : null,
            nextAttemptAt: new Date(Date.now() + backoffMs),
            lastError: message.slice(0, 2000),
          },
        });
      } catch (updateError) {
        console.error("[AUDIT_OUTBOX_RETRY_STATE_ERROR]", updateError);
      }

      console.error("[AUDIT_OUTBOX_PROCESSING_ERROR]", {
        id: entry.id,
        attempts,
        deadLetter,
        error,
      });
      if (deadLetter) result.deadLettered += 1;
      else result.retried += 1;
    }
  }

  return result;
}
