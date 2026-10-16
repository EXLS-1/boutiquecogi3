// server/services/audit.service.ts
// ============================================
// SERVICE D'INSERTION D'AUDIT (SNAPSHOT FRAIS)
// ============================================
// Capture l'état ACTUEL de l'utilisateur (nom + email) au moment exact de
// l'action, puis fige ce snapshot dans audit_log (actorName / actorEmail).
// Aucune donnée n'est acceptée depuis le client : intégrité absolue.
// Un échec d'audit n'a jamais le droit de bloquer l'action métier.

import { prisma } from "@/lib/prisma";

interface LogActionParams {
  action: string;
  targetId?: string;
  userId: string;
}

export async function recordAuditLog({
  action,
  targetId,
  userId,
}: LogActionParams) {
  try {
    // 1. Récupération de l'état actuel et frais de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    if (!user) {
      throw new Error(
        `Échec de l'audit : Utilisateur introuvable (ID: ${userId})`
      );
    }

    // 2. Écriture atomique avec les snapshots figés
    return await prisma.auditLog.create({
      data: {
        action,
        targetId,
        userId,
        actorName: user.name ?? null,
        actorEmail: user.email,
      },
    });
  } catch (error) {
    // Un échec d'audit ne doit jamais bloquer l'action métier critique,
    // mais doit être logué lourdement dans la console serveur.
    console.error("[CRITICAL_AUDIT_ERROR]", error);
  }
}