// app/admin/role_audit/[roleId]/page.tsx
// ============================================================
// Audit par rôle : assignments, overrides et journal filtré
// sur ce rôle uniquement.
// ============================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { RoleModuleNav } from '@/components/admin/roles/RoleModuleNav';
import { RoleAssignmentsPanel } from '@/components/admin/roles/detail/RoleAssignmentsPanel';
import { RoleService } from '@/lib/admin/roles/role.service';
import { AuditService } from '@/lib/admin/roles/audit.service';

export const metadata: Metadata = { title: 'Audit du rôle | Admin', robots: 'noindex, nofollow' };
export const dynamic = 'force-dynamic';

export default async function RoleAuditDetailPage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;
  const [roleResult, assignmentsResult, logsResult] = await Promise.all([
    RoleService.getRole(roleId),
    AuditService.listAssignments(roleId),
    AuditService.listAuditLogs({ roleId, take: 100 }),
  ]);

  if (!roleResult.success) notFound();
  const role = roleResult.data;
  const assignments = assignmentsResult.success ? assignmentsResult.data : [];
  const logs = logsResult.success ? logsResult.data : [];

  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-6">
      <RoleModuleNav />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/role_audit" className="text-sm text-sky-700 hover:underline">← Retour à l&apos;audit global</Link>
          <h1 className="text-3xl font-bold text-slate-950">Audit · {role.name}</h1>
          <p className="mt-1 text-slate-600">Niveau {role.level} · {assignments.length} assignment(s) · {logs.length} événement(s)</p>
        </div>
        <Link href={`/admin/roles/${role.id}`} className="text-sm font-medium text-sky-700 hover:underline">
          Configuration du rôle →
        </Link>
      </header>

      <RoleAssignmentsPanel
        assignments={assignments.map((assignment) => ({
          id: assignment.id,
          userId: assignment.userId,
          userName: assignment.userName,
          userEmail: assignment.userEmail,
          assignedAt: assignment.assignedAt,
          isBlocked: assignment.isBlocked,
          blockedReason: assignment.blockedReason,
          overrides: assignment.overrides.map((override) => ({
            id: override.id,
            permissionCode: override.permissionCode,
            permissionName: override.permissionName,
            isGranted: override.isGranted,
            expiresAt: override.expiresAt,
          })),
        }))}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-950">Journal d&apos;audit du rôle</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun événement pour ce rôle.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {logs.map((log) => (
              <li key={log.id} className="py-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong className="text-slate-900">{log.action}</strong>
                  <time className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString('fr-FR')}</time>
                </div>
                <p className="mt-1 text-xs text-slate-600">par {log.actorName || log.actorEmail || 'système'}</p>
                {log.details && (
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs text-slate-500">{log.details}</pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
