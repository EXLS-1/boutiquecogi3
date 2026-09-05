// app/admin/role_audit/page.tsx
// ============================================================
// Role Audit — vue globale : Assignments (utilisateur, rôle,
// assignedBy, assignedAt, blocked), Permission Overrides
// (ON/OFF, grantedBy, expiresAt) et Audit Logs (ROLE_*).
// ============================================================

import Link from 'next/link';
import type { Metadata } from 'next';

import { RoleModuleNav } from '@/components/admin/roles/RoleModuleNav';
import { RoleAssignmentsPanel } from '@/components/admin/roles/detail/RoleAssignmentsPanel';
import { AuditService } from '@/lib/admin/roles/audit.service';
import { RoleService } from '@/lib/admin/roles/role.service';
import { ROLE_AUDIT_ACTIONS } from '@/lib/admin/roles/role.constants';

export const metadata: Metadata = { title: 'Assignments et audit des rôles | Admin', robots: 'noindex, nofollow' };
export const dynamic = 'force-dynamic';

export default async function RoleAuditPage() {
  const [assignmentsResult, logsResult, rolesResult] = await Promise.all([
    AuditService.listAssignments(),
    AuditService.listAuditLogs({ take: 100 }),
    RoleService.listRoles(),
  ]);

  const assignments = assignmentsResult.success ? assignmentsResult.data : [];
  const logs = logsResult.success ? logsResult.data : [];
  const roles = rolesResult.success ? rolesResult.data : [];
  const overrides = assignments.flatMap((assignment) => assignment.overrides);

  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-6">
      <RoleModuleNav />
      <header>
        <h1 className="text-3xl font-bold text-slate-950">Role Audit</h1>
        <p className="mt-1 text-slate-600">
          Suivi des utilisateurs assignés, des overrides et des changements de droits.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-4">
        {[
          ['Assignments', assignments.length],
          ['Overrides', overrides.length],
          ['Événements', logs.length],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-950">{value}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </section>

      {!assignmentsResult.success && (
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">Assignments : {assignmentsResult.error}</p>
      )}

      {/* Assignments */}
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

      {/* Permission Overrides */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-950">Permission Overrides</h2>
        {overrides.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun override actif.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Permission</th>
                  <th className="px-3 py-2">État</th>
                  <th className="px-3 py-2">Utilisateur</th>
                  <th className="px-3 py-2">Rôle</th>
                  <th className="px-3 py-2">Expire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overrides.map((override) => {
                  const assignment = assignments.find((a) => a.id === override.assignmentId);
                  return (
                    <tr key={override.id}>
                      <td className="px-3 py-2 font-mono text-xs">{override.permissionCode}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded px-2 py-0.5 text-xs ${override.isGranted ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {override.isGranted ? 'ON' : 'OFF'}
                        </span>
                      </td>
                      <td className="px-3 py-2">{assignment ? assignment.userName || assignment.userEmail : '—'}</td>
                      <td className="px-3 py-2">{assignment?.roleName ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">
                        {override.expiresAt ? new Date(override.expiresAt).toLocaleDateString('fr-FR') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Audit Logs */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-950">Audit Logs</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun événement enregistré.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {logs.map((log) => {
              const role = roles.find((r) => r.id === log.targetId);
              return (
                <li key={log.id} className="py-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong className="text-slate-900">{log.action}</strong>
                    <time className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString('fr-FR')}</time>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {log.actorName || log.actorEmail || 'système'} · cible {log.targetType || 'N/A'}
                    {role ? (
                      <> · <Link href={`/admin/roles/${role.id}`} className="text-sky-700 hover:underline">{role.name}</Link></>
                    ) : log.targetId ? (
                      <> · {log.targetId.slice(0, 8)}…</>
                    ) : null}
                  </p>
                  {log.details && (
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs text-slate-500">{log.details}</pre>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-xs text-slate-400">
          Actions tracées : {ROLE_AUDIT_ACTIONS.join(', ')}.
        </p>
      </section>
    </main>
  );
}
