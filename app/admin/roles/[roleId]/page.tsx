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
