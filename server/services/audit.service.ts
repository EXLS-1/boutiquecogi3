// server/services/audit.service.ts
// ============================================
// SERVICE D'INSERTION D'AUDIT (SNAPSHOT FRAIS)
// ============================================
// Capture l'état ACTUEL de l'utilisateur (nom + email) au moment exact de
// l'action, puis fige ce snapshot dans audit_log (actorName / actorEmail).
// Aucune donnée n'est acceptée depuis le client : intégrité absolue.
// Un échec d'audit n'a jamais le droit de bloquer l'action métier.

import { prisma } from "@/lib/prisma";
import { AuditSeverity, Prisma } from "@prisma/client";
import { isIP } from "node:net";
import { headers } from "next/headers";
import { sanitizeAuditText, sanitizeAuditValue } from "./audit-sanitizer";
import {
  type AuditActorType,
  type AuditOutboxPayload,
  toAuditJson,
} from "./audit-outbox";

// Ré-export pour commodité : les Server Actions importent la sévérité
// directement depuis ce module (source unique de vérité de l'audit).
export { AuditSeverity };


const GENERIC_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toUuidOrNull(id?: string | null): string | null {
  if (!id || typeof id !== "string") return null;
  const trimmed = id.trim();
  return GENERIC_UUID_REGEX.test(trimmed) ? trimmed : null;
}

export interface LogActionParams {
  action: string;
  targetId?: string | null;
  userId: string | null;
  actorId?: string | null;
  actorType?: AuditActorType;
  impersonatedBy?: string | null;
  severity?: AuditSeverity; // Optionnel, prend INFO par défaut si non spécifié
  status?: string;
  actorSnapshot?: { name: string | null; email: string | null };
  /** Type de ressource cible : "ROLE", "USER", "ACCOUNT", "ORDER", "PRODUCT"... */
  targetType?: string;
  /** Niveau de rôle de l'acteur au moment de l'action (ctx.roleLevel). */
  roleLevel?: number;
  /** Détails riches (objet sérialisé automatiquement) stockés en colonne `details`. */
  details?: string | Record<string, unknown>;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
  traceId?: string | null;
  reason?: string | null;
  /** Message d'erreur si l'action a échoué (statut ≠ SUCCESS). */
  error?: string;
  errorCode?: string | null;
}

/**
 * Matrice de sévérité par défaut selon l'action en clair.
 * Utilisée lorsque la sévérité n'est pas explicitement spécifiée.
 */
export function resolveAuditSeverity(action: string): AuditSeverity {
  const normalized = action.toUpperCase();
  if (
    normalized.includes("DELETE") ||
    normalized.includes("RESTORE") ||
    normalized.includes("CANCEL") ||
    normalized.includes("REFUND") ||
    normalized.includes("SECURITY")
  ) {
    return AuditSeverity.CRITICAL;
  }
  if (
    normalized.includes("UPDATE") ||
    normalized.includes("CREATE") ||
    normalized.includes("BLOCK") ||
    normalized.includes("UNBLOCK") ||
    normalized.includes("ASSIGN") ||
    normalized.includes("ADJUST") ||
    normalized.includes("TRANSFER")
  ) {
    return AuditSeverity.WARNING;
  }
  return AuditSeverity.INFO;
}

function serializeDetails(
  details: LogActionParams["details"]
): string | undefined {
  if (details === undefined) return undefined;
  if (typeof details === "string") return sanitizeAuditText(details);
  return JSON.stringify(sanitizeAuditValue(details));
}

function getSafeTraceId(value: string | null): string | null {
  if (!value) return null;
  const traceparent = /^00-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$/i.exec(value);
  if (traceparent) return traceparent[1].toLowerCase();
  return /^[a-zA-Z0-9._:-]{1,128}$/.test(value) ? value : null;
}

function getUserAgentDetails(userAgent: string | null): {
  browser: string | null;
  os: string | null;
  device: string | null;
} {
  if (!userAgent) return { browser: null, os: null, device: null };

  const browser =
    userAgent.includes("Edg/")
      ? "Edge"
      : userAgent.includes("Firefox")
        ? "Firefox"
        : userAgent.includes("Chrome")
          ? "Chrome"
          : userAgent.includes("Safari")
            ? "Safari"
            : null;
  const os =
    userAgent.includes("Windows")
      ? "Windows"
      : userAgent.includes("Mac")
        ? "macOS"
        : userAgent.includes("Android")
          ? "Android"
          : userAgent.includes("iOS")
            ? "iOS"
            : userAgent.includes("Linux")
              ? "Linux"
              : null;
  const device = userAgent.includes("Tablet")
    ? "Tablet"
    : userAgent.includes("Mobile")
      ? "Mobile"
      : "Desktop";

  return { browser, os, device };
}

function getTrustedClientIp(
  forwardedFor: string | null,
  realIp: string | null,
): string | null {
  const trustedProxyCount = Number.parseInt(
    process.env.AUDIT_TRUSTED_PROXY_COUNT ?? "0",
    10,
  );
  if (
    !Number.isInteger(trustedProxyCount) ||
    trustedProxyCount < 1 ||
    trustedProxyCount > 16
  ) {
    return null;
  }

  const forwardedHops = forwardedFor
    ?.split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  if (forwardedHops?.length) {
    const clientIndex = forwardedHops.length - trustedProxyCount - 1;
    const candidate = clientIndex >= 0 ? forwardedHops[clientIndex] : null;
    if (candidate && isIP(candidate)) return candidate;
  }

  return realIp && isIP(realIp) ? realIp : null;
}

async function getAuditRequestContext(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  sessionId: string | null;
  traceId: string | null;
}> {
  try {
    const requestHeaders = await headers();
    const userAgent =
      requestHeaders.get("user-agent")?.slice(0, 1000) ?? null;
    const userAgentDetails = getUserAgentDetails(userAgent);
    let sessionId: string | null = null;
    try {
      const { getSessionFromProvider } = await import(
        "@/components/providers/session-provider"
      );
      const session = await getSessionFromProvider();
      sessionId =
        typeof session?.session?.id === "string"
          ? session.session.id.slice(0, 128)
          : null;
    } catch (error) {
      console.warn("[AUDIT_CONTEXT_SESSION_UNAVAILABLE]", error);
    }

    return {
      ipAddress: getTrustedClientIp(
        requestHeaders.get("x-forwarded-for"),
        requestHeaders.get("x-real-ip"),
      ),
      userAgent,
      ...userAgentDetails,
      sessionId,
      traceId:
        getSafeTraceId(requestHeaders.get("traceparent")?.trim() ?? null) ??
        getSafeTraceId(requestHeaders.get("x-request-id")?.trim() ?? null),
    };
  } catch (error) {
    console.warn("[AUDIT_CONTEXT_UNAVAILABLE]", error);
    return {
      ipAddress: null,
      userAgent: null,
      browser: null,
      os: null,
      device: null,
      sessionId: null,
      traceId: null,
    };
  }
}

function safeJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  return toAuditJson(sanitizeAuditValue(value));
}

export async function recordAuditLog({
  action,
  targetId,
  userId,
  actorId,
  actorType,
  impersonatedBy,
  severity,
  status = "SUCCESS",
  actorSnapshot,
  targetType,
  roleLevel,
  details,
  oldValue,
  newValue,
  metadata,
  ipAddress,
  userAgent,
  sessionId,
  traceId,
  reason,
  error,
  errorCode,
}: LogActionParams) {
  try {
    const resolvedUserId = userId ? toUuidOrNull(userId) : null;
    const user =
      resolvedUserId !== null
        ? await prisma.user.findUnique({
            where: { id: resolvedUserId },
            select: { id: true, name: true, email: true },
          })
        : null;

    const finalUserId = user?.id ?? null;
    const finalActorName = user?.name ?? actorSnapshot?.name ?? null;
    const finalActorEmail = user?.email ?? actorSnapshot?.email ?? null;
    const requestContext = await getAuditRequestContext();

    if (userId && !resolvedUserId) {
      console.warn("[AUDIT_WARNING] Ignoring invalid actor id for audit log.");
    }

    if (userId && !user && !actorSnapshot) {
      console.warn("[AUDIT_WARNING] Persisting anonymous audit log because actor no longer exists.");
    }

    const detailString = serializeDetails(details);
    const validTargetId = toUuidOrNull(targetId);
    const effectiveSeverity = severity ?? resolveAuditSeverity(action);
    const resourceId = targetId?.trim().slice(0, 128) || null;
    const finalUserAgent =
      userAgent?.slice(0, 1000) ?? requestContext.userAgent;
    const userAgentDetails = getUserAgentDetails(finalUserAgent);
    const finalActorId =
      actorId?.trim().slice(0, 64) ||
      user?.id ||
      resolvedUserId ||
      "anonymous";
    const finalActorType =
      actorType ??
      (resolvedUserId
        ? "user"
        : finalActorId === "anonymous"
          ? "anonymous"
          : "system");
    const safeMetadata = safeJsonValue({
      ...metadata,
      ipAddress: ipAddress && isIP(ipAddress) ? ipAddress : requestContext.ipAddress,
      userAgent: userAgent?.slice(0, 1000) ?? requestContext.userAgent,
      sessionId: sessionId?.slice(0, 128) ?? requestContext.sessionId,
      traceId: getSafeTraceId(traceId ?? requestContext.traceId),
      __auditSeverity: effectiveSeverity,
    });
    const safeOldValue = safeJsonValue(oldValue);
    const safeNewValue = safeJsonValue(newValue);
    const event: AuditOutboxPayload = {
      createdAt: new Date().toISOString(),
      userId: finalUserId,
      actorId: finalActorId,
      actorType: finalActorType,
      impersonatedBy: impersonatedBy?.trim().slice(0, 64) ?? null,
      roleLevel: roleLevel ?? 7,
      action: action.slice(0, 128),
      targetId: validTargetId,
      targetType: targetType?.slice(0, 64) ?? null,
      entityId: targetId && !validTargetId ? targetId.slice(0, 128) : null,
      resourceType: targetType?.slice(0, 64) ?? null,
      resourceId,
      actorName: finalActorName,
      actorEmail: finalActorEmail,
      severity: effectiveSeverity,
      status: status.slice(0, 64),
      ...(safeOldValue !== undefined && { oldValue: safeOldValue }),
      ...(safeNewValue !== undefined && { newValue: safeNewValue }),
      ...(safeMetadata !== undefined && { metadata: safeMetadata }),
      details: detailString ?? null,
      ipAddress:
        (ipAddress && isIP(ipAddress) ? ipAddress : requestContext.ipAddress) ??
        null,
      userAgent: finalUserAgent,
      ...userAgentDetails,
      sessionId: sessionId?.slice(0, 128) ?? requestContext.sessionId,
      traceId: getSafeTraceId(traceId ?? requestContext.traceId),
      reason: reason ? sanitizeAuditText(reason).slice(0, 2000) : null,
      error: error ? sanitizeAuditText(error).slice(0, 2000) : null,
      errorCode: errorCode?.slice(0, 128) ?? null,
    };
    const payload = toAuditJson(event);
    if (!payload) {
      throw new Error("Could not serialize audit event for the outbox.");
    }

    const outboxEntry = await prisma.auditOutbox.create({
      data: { payload },
      select: { id: true },
    });
    return {
      id: outboxEntry.id,
      actorName: finalActorName,
      actorEmail: finalActorEmail,
    };
  } catch (err) {
    // Un échec d'audit ne doit jamais bloquer l'action métier critique,
    // mais doit être logué lourdement dans la console serveur.
    console.error("[CRITICAL_AUDIT_ERROR]", err);
  }
}

/**
 * Résout l'identifiant de l'acteur depuis la session sécurisée courante
 * (BetterAuth via next/headers). Jamais une donnée venue du client.
 * Retourne `null` si aucune session n'est disponible (aucune exception).
 */
export async function getAuditActorId(): Promise<string | null> {
  try {
    const { getSessionFromProvider } = await import(
      "@/components/providers/session-provider"
    );
    const session = await getSessionFromProvider();
    if (session?.user?.id) return session.user.id;
  } catch {
    // Fallback if session-provider is not available or throws
  }
  try {
    const { headers } = await import("next/headers");
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Helper d'audit destiné aux Server Actions qui n'empruntent PAS le
 * `withSecurePrisma` (accès Prisma directs). L'userId est toujours extrait
 * de la session sécurisée courante — jamais depuis les arguments d'appel.
 *
 * Ne lève jamais d'exception : un échec d'audit n'a jamais le droit de
 * bloquer l'action métier.
 */
export async function recordServerActionAudit({
  action,
  targetId,
  severity,
  targetType,
  details,
  status = "SUCCESS",
  error,
}: {
  action: string;
  targetId?: string | null;
  severity?: AuditSeverity;
  targetType?: string;
  details?: string | Record<string, unknown>;
  status?: string;
  error?: string;
}): Promise<void> {
  const userId = await getAuditActorId();
  await recordAuditLog({
    action,
    targetId,
    userId,
    severity: severity ?? resolveAuditSeverity(action),
    status,
    targetType,
    details,
    error,
  });
}
