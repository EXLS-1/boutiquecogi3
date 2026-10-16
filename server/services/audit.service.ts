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

interface LogActionParams {
  action: string;
  targetId?: string;
  userId: string | null;
  severity?: AuditSeverity; // Optionnel, prend INFO par défaut si non spécifié
  status?: string;
  actorSnapshot?: { name: string | null; email: string | null };
}

export async function recordAuditLog({
  action,
  targetId,
  userId,
  severity = AuditSeverity.INFO,
  status = "SUCCESS",
  actorSnapshot,
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

    return await prisma.auditLog.create({
      data: {
        action,
        targetId,
        userId: user ? userId : null,
        actorName: user?.name ?? actorSnapshot?.name ?? null,
        actorEmail: user?.email ?? actorSnapshot?.email ?? null,
        severity,
        status,
      },
    });
  } catch (error) {
    // Un échec d'audit ne doit jamais bloquer l'action métier critique,
    // mais doit être logué lourdement dans la console serveur.
    console.error("[CRITICAL_AUDIT_ERROR]", error);
  }
}