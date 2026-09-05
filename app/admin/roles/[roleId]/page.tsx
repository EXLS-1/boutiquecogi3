// app/admin/roles/[roleId]/page.tsx
// ============================================================
// Détail d'un rôle : configuration, actions (activation,
// blocage), permissions effectives, restrictions, audit trail.
// ============================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { RoleModuleNav } from '@/components/admin/roles/RoleModuleNav';
import { RoleConfigActions } from '@/components/admin/roles/detail/RoleConfigActions';
import { RoleService } from '@/lib/admin/roles/role.service';
import { PermissionService } from '@/lib/admin/roles/permission.service';
import { RestrictionService } from '@/lib/admin/roles/restriction.service';
import { AuditService } from '@/lib/admin/roles/audit.service';

export const metadata: Metadata = { title: 'Détail du rôle | Admin', robots: 'noindex, nofollow' };
export const dynamic = 'force-dynamic';

export default async function RoleDetailPage({ params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  const [roleResult, effectiveResult, restrictionsResult, logsResult, assignmentsResult] =
    await Promise.all([
      RoleService.getRole(roleId),
      PermissionService.listEffective(roleId),
      RestrictionService.getRestrictions(roleId),
      AuditService.listAuditLogs({ roleId, take: 50 }),
      AuditService.listAssignments(roleId),
    ]);

  if (!roleResult.success) notFound();
  const role = roleResult.data;

  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-6">
      <RoleModuleNav />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/roles" className="text-sm text-sky-700 hover:underline">← Retour aux rôles</Link>
          <h1 className="text-3xl font-bold tracking-tight">{role.name}</h1>
          <p className="text-slate-600">{role.description || 'Aucune description'}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-slate-100 px-2 py-1">Niveau {role.level}</span>
          <span className="rounded bg-slate-100 px-2 py-1">{role.userCount} utilisateur(s)</span>
          <span className="rounded bg-slate-100 px-2 py-1">{role.permissionCount} permission(s)</span>
          {role.isSystem && <span className="rounded bg-indigo-100 px-2 py-1 text-indigo-700">rôle système</span>}
          {role.isBlocked && <span className="rounded bg-red-100 px-2 py-1 text-red-700">bloqué</span>}
          {!role.isActive && <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">inactif</span>}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <RoleConfigActions roleId={role.id} isActive={role.isActive} isBlocked={role.isBlocked} />

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-950">Informations</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Hiérarchie (parent)</dt>
            <dd>{role.parentName ?? '—'}</dd>
            <dt className="text-slate-500">Créé le</dt>
            <dd>{new Date(role.createdAt).toLocaleString('fr-FR')}</dd>
            <dt className="text-slate-500">Créé par</dt>
            <dd className="truncate">{role.createdBy ?? '—'}</dd>
            <dt className="text-slate-500">Modifié le</dt>
            <dd>{new Date(role.updatedAt).toLocaleString('fr-FR')}</dd>
            <dt className="text-slate-500">Bloqué le</dt>
            <dd>{role.blockedAt ? new Date(role.blockedAt).toLocaleString('fr-FR') : '—'}</dd>
            {role.blockedReason && (<><dt className="text-slate-500">Motif</dt><dd>{role.blockedReason}</dd></>)}
          </dl>
        </section>
      </div>

      {/* Permissions effectives */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-950">Permissions effectives</h2>
        {effectiveResult.success ? (
          <>
            <p className="text-sm text-slate-600">
              {effectiveResult.data.effective.length} permission(s) effective(s) —{' '}
              {effectiveResult.data.own.length} propre(s), {effectiveResult.data.inherited.length} héritée(s)
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {effectiveResult.data.effective.map((code) => (
                <span key={code} className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">{code}</span>
              ))}
            </div>
            <Link href={`/admin/role_permissions/${role.id}`} className="mt-3 inline-block text-sm font-medium text-sky-700 hover:underline">
              Gérer les permissions →
            </Link>
          </>
        ) : (
          <p className="text-sm text-red-600">{effectiveResult.error}</p>
        )}
      </section>

      {/* Restrictions */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-950">Restrictions</h2>
        {restrictionsResult.success && Object.keys(restrictionsResult.data).length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(restrictionsResult.data).map(([key, value]) => (
              <span key={key} className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                {key}={String(value)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Aucune restriction explicite (valeurs par défaut du RBAC).</p>
        )}
        <Link href={`/admin/role_restrictions/${role.id}`} className="mt-3 inline-block text-sm font-medium text-sky-700 hover:underline">
          Gérer les restrictions →
        </Link>
      </section>

      {/* Assignments */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-950">
          Assignments ({assignmentsResult.success ? assignmentsResult.data.length : 0})
        </h2>
        {assignmentsResult.success && assignmentsResult.data.length > 0 ? (
          <ul className="divide-y divide-slate-100 text-sm">
            {assignmentsResult.data.map((assignment) => (
              <li key={assignment.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>{assignment.userName || assignment.userEmail} <span className="text-slate-500">({assignment.userEmail})</span></span>
                <span className="text-xs text-slate-500">
                  {assignment.isBlocked ? 'bloqué · ' : ''}
                  assigné le {new Date(assignment.assignedAt).toLocaleDateString('fr-FR')} · {assignment.overrides.length} override(s)
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Aucun utilisateur assigné.</p>
        )}
        <Link href={`/admin/role_audit/${role.id}`} className="mt-3 inline-block text-sm font-medium text-sky-700 hover:underline">
          Voir l&apos;audit →
        </Link>
      </section>

      {/* Journal d'audit */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-950">Journal d&apos;audit</h2>
        {logsResult.success && logsResult.data.length > 0 ? (
          <ul className="divide-y divide-slate-100 text-sm">
            {logsResult.data.map((log) => (
              <li key={log.id} className="py-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong className="text-slate-900">{log.action}</strong>
                  <time className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString('fr-FR')}</time>
                </div>
                <p className="text-xs text-slate-500">par {log.actorName || log.actorEmail || 'système'}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Aucun événement.</p>
        )}
      </section>
    </main>
  );
}
