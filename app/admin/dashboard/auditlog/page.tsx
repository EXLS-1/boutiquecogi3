// app/auditlog/page.tsx
// ============================================
// PAGE D'ADMINISTRATION — JOURNAUX D'AUDIT
// ============================================
// Page minimaliste : se contente d'orchestrer le fetch initial et le rendu.
// Toute la logique métier (pagination, filtres, stats) est déléguée à :
//   - lib/audit/audit.service.ts (lecture/agrégation)
//   - components/auditlog/audit-log-viewer.tsx (UI atomique)
//
// Sécurité : accès réservé aux rôles disposant de la permission `audit:view-logs`.
// SEO : metadata statique + `force-dynamic` pour garantir la fraîcheur des données.
// ============================================

import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { History, ShieldAlert } from "lucide-react";

// ─── Services & Helpers ────────────────────
import { getCurrentUserWithRole, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { getAuditLogs, getAuditStats } from "@/lib/audit/audit.service";
import { AUDIT_DEFAULT_LIMIT } from "@/lib/audit/constants";

// ─── Composants UI ─────────────────────────
import { AuditLogViewer } from "@/components/auditlog/audit-log-viewer";
import { AuditLogStatsCards } from "@/components/auditlog/audit-log-stats-cards";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

// ─── Metadata SEO ──────────────────────────
export const metadata: Metadata = {
  title: "Journaux d'Audit — Administration | Boutique Cogi",
  description:
    "Consultez l'historique complet des actions effectuées sur la plateforme : authentification, gestion des produits, commandes, paiements et modifications critiques.",
  robots: { index: false, follow: false }, // Page admin : ne pas indexer
};

// ─── Configuration Next.js ─────────────────
// Force le rendu dynamique pour garantir des données toujours fraîches
// (les logs d'audit évoluent en temps réel).
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── Page Principale ───────────────────────
export default async function AuditLogPage() {
  // 1. Vérification de l'authentification
  const userData = await getCurrentUserWithRole();
  if (!userData) {
    redirect("/auth/signin?callbackUrl=/auditlog");
  }

  const { user, role } = userData;

  // 2. Vérification de la permission RBAC
  const canViewLogs = await hasPermission(role, PERMISSIONS["audit:view-logs"]);
  if (!canViewLogs) {
    return <AccessDeniedFallback />;
  }

  // 3. Fetch initial des données (logs + stats) en parallèle
  const [initialLogs, initialStats] = await Promise.all([
    getAuditLogs({
      page: 1,
      limit: AUDIT_DEFAULT_LIMIT,
      orderBy: "createdAt",
      orderDirection: "desc",
    }),
    getAuditStats(30), // 30 derniers jours
  ]);

  return (
    <DashboardShell
      userEmail={user.email}
      userName={user.name ?? null}
      userImage={user.image ?? null}
    >
      {/* ─── En-tête ─────────────────────── */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Journaux d'Audit
            </h1>
            <p className="text-sm text-slate-500">
              Historique complet des actions système — Connecté en tant que{" "}
              <span className="font-medium text-slate-700">
                {user.name ?? user.email}
              </span>{" "}
              ({role})
            </p>
          </div>
        </div>
      </header>

      {/* ─── Statistiques (30 derniers jours) ─── */}
      <AuditLogStatsCards stats={initialStats} />

      {/* ─── Viewer principal (filtres + table + détails) ─── */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
            <span className="ml-3 text-slate-500 font-medium">
              Chargement des journaux d'audit...
            </span>
          </div>
        }
      >
        <AuditLogViewer initialLogs={initialLogs} />
      </Suspense>
    </DashboardShell>
  );
}

// ─── Fallback "Accès refusé" ───────────────
// Composant atomique inline (simple, pas de dépendance externe).
function AccessDeniedFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-600" />
        <h2 className="mt-4 text-xl font-semibold text-red-900">
          Accès non autorisé
        </h2>
        <p className="mt-2 text-sm text-red-700">
          Vous ne disposez pas de la permission{" "}
          <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
            audit:view-logs
          </code>{" "}
          nécessaire pour consulter les journaux d'audit.
        </p>
      </div>
    </div>
  );
}
