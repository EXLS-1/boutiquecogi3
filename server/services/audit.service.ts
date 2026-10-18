// server/services/audit.service.ts
// ============================================
// SERVICE D'INSERTION D'AUDIT (SNAPSHOT FRAIS)
// ============================================
// Capture l'état ACTUEL de l'utilisateur (nom + email) au moment exact de
// l'action, puis fige ce snapshot dans audit_log (actorName / actorEmail).
// Aucune donnée n'est acceptée depuis le client : intégrité absolue.
// Un échec d'audit n'a jamais le droit de bloquer l'action métier.

import { prisma } from "@/lib/prisma";
import { AuditSeverity } from "@prisma/client";

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
  severity?: AuditSeverity; // Optionnel, prend INFO par défaut si non spécifié
  status?: string;
  actorSnapshot?: { name: string | null; email: string | null };
  /** Type de ressource cible : "ROLE", "USER", "ACCOUNT", "ORDER", "PRODUCT"... */
  targetType?: string;
  /** Niveau de rôle de l'acteur au moment de l'action (ctx.roleLevel). */
  roleLevel?: number;
  /** Détails riches (objet sérialisé automatiquement) stockés en colonne `details`. */
  details?: string | Record<string, unknown>;
  /** Message d'erreur si l'action a échoué (statut ≠ SUCCESS). */
  error?: string;
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
  if (typeof details === "string") return details;
  try {
    return JSON.stringify(details);
  } catch {
    return JSON.stringify({ unserializable: true });
  }
}

export async function recordAuditLog({
  action,
  targetId,
  userId,
  severity,
  status = "SUCCESS",
  actorSnapshot,
  targetType,
  roleLevel,
  details,
  error,
}: LogActionParams) {
  try {
    // Resolve the actor from the database rather than trusting action input.
    // A missing/deleted actor is represented by a null FK while snapshots remain.
    const user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true },
        })
      : null;

    const detailString = serializeDetails(details);
    const validTargetId = toUuidOrNull(targetId);
    const effectiveSeverity = severity ?? resolveAuditSeverity(action);

    return await prisma.auditLog.create({
      data: {
        action,
        targetId: validTargetId ?? undefined,
        userId: user ? userId! : null,
        actorName: user?.name ?? actorSnapshot?.name ?? null,
        actorEmail: user?.email ?? actorSnapshot?.email ?? null,
        severity: effectiveSeverity,
        status,
        ...(targetId && !validTargetId ? { entityId: targetId } : {}),
        ...(targetType !== undefined && { targetType }),
        ...(roleLevel !== undefined && { roleLevel }),
        ...(detailString !== undefined && { details: detailString }),
        ...(error !== undefined && { error }),
      },
    });
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
      "@/lib/auth/session-provider"
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