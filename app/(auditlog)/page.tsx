// app/auditlog/page.tsx
// Ce fichier représente la page d'administration pour visualiser les journaux d'audit.
// Il utilise Next.js 16 avec le système de fichiers pour les routes et Prisma pour accéder à la base de données.
// La page affiche les 100 derniers journaux d'audit, avec des informations sur l'utilisateur qui a effectué l'action, le type d'action, et la date.
// Note: Pour des volumes plus importants de journaux d'audit, une pagination ou un système de filtrage devrait être implémenté pour améliorer les performances et l'expérience utilisateur.
// Importations nécessaires pour la page
import { Suspense } from "react";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { AuditLogViewer } from "@/components/auditlog/audit-log-viewer";
import { History } from "lucide-react";

export const dynamic = "force-dynamic"; // Assure que les données sont toujours fraîches

export default async function AdminAuditLogsPage() {
  // Récupération des 100 derniers journaux d'audit pour des raisons de performance.
  // Une pagination pourrait être ajoutée pour de plus grands volumes.
  const auditLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex items-center gap-3">
        <History className="h-8 w-8 text-cyan-700" />
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Journaux d'Audit</h1>
      </div>

      <Suspense fallback={<div className="text-center py-10 text-gray-500 font-medium">Chargement des journaux d'audit...</div>}>
        <AuditLogViewer initialAuditLogs={auditLogs} />
      </Suspense>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Journaux d'Audit - Administration",
  description: "Visualisez et gérez les journaux d'audit du système."  
}
