// server/actions/audit.actions.ts
// ============================================
// LECTURE DES DERNIÈRES ACTIVITÉS D'AUDIT
// ============================================
// Zéro jointure : actorName / actorEmail sont des snapshots dénormalisés
// capturés à l'écriture par recordAuditLog (server/services/audit.service.ts).
//
// NOTE: pas de directive "use server" ici — ce module est réservé aux Server
// Components (RSC). Exposer ces fonctions comme Server Actions créerait un
// endpoint RPC appelable depuis le client SANS garde RBAC (les logs d'audit
// contiennent des emails : données sensibles).

import { prisma } from "@/lib/prisma";

export type LatestActivity = {
  id: string;
  action: string;
  createdAt: Date;
  actorName: string | null;
  actorEmail: string | null;
};

/**
 * Les 10 dernières activités d'audit, lues directement depuis les colonnes
 * figées — performance maximale, aucune jointure parasite.
 */
export async function getLatestActivities(
  limit: number = 10
): Promise<LatestActivity[]> {
  return await prisma.auditLog.findMany({
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      action: true,
      createdAt: true,
      actorName: true, // On lit directement le snapshot figé
      actorEmail: true, // Utile en fallback
    },
  });
}