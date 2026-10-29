// app/admin/roles/page.tsx
// ============================================================
// Page Admin "Rôles" — Server Component pur.
// Liste des 7 rôles : niveau, hiérarchie, description, statut,
// rôle système, blocage, compteurs, meta création/modification.
// ============================================================

import Link from 'next/link';
import type { Metadata } from 'next';

import { RoleModuleNav } from '@/components/admin/roles/RoleModuleNav';
import { RoleService } from '@/lib/admin/roles/role.service';

export const metadata: Metadata = {
  title: 'Gestion des Rôles | Admin - Boutique Cogi',
  description:
    'Gérez les rôles utilisateurs et leurs permissions sur la plateforme e-commerce Boutique Cogi.',
  robots: 'noindex, nofollow',
};

export const dynamic = 'force-dynamic';

export default async function AdminRolesPage() {
  const result = await RoleService.listRoles();
  const roles = result.success ? result.data : [];

  const totalRoles = roles.length;
  const activeRoles = roles.filter((role) => role.isActive).length;
  const blockedRoles = roles.filter((role) => role.isBlocked).length;
  const totalUsers = roles.reduce((sum, role) => sum + role.userCount, 0);

  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-6">
      <RoleModuleNav />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Rôles</h1>
          <p className="text-muted-foreground">
            Configurez les rôles et les niveaux d&apos;accès pour les administrateurs.
          </p>
        </div>
        <Link href="/admin/roles/new" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          + Nouveau rôle
        </Link>
      </header>

      {/* Vue d'ensemble renforcée */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ['Rôles', totalRoles],
          ['Actifs', activeRoles],
          ['Bloqués', blockedRoles],
          ['Utilisateurs affectés', totalUsers],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-950">{value}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </section>

      {!result.success && (
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Impossible de charger les rôles : {result.error}
        </p>
      )}

      {/* Table de configuration */}
      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Niveau</th>
              <th className="px-4 py-3">Hiérarchie</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Système</th>
              <th className="px-4 py-3">Permissions</th>
              <th className="px-4 py-3">Utilisateurs</th>
              <th className="px-4 py-3">Modifié</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {roles.map((role) => (
              <tr key={role.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-950">{role.name}</p>
                  <p className="max-w-xs truncate text-xs text-slate-500">{role.description}</p>
                </td>
                <td className="px-4 py-3 font-mono">{role.level}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{role.parentName ?? '—'}</td>
                <td className="px-4 py-3">
                  {role.isBlocked ? (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">bloqué</span>
                  ) : role.isActive ? (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">actif</span>
                  ) : (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">inactif</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">{role.isSystem ? 'oui' : 'non'}</td>
                <td className="px-4 py-3 font-mono">{role.permissionCount}</td>
                <td className="px-4 py-3 font-mono">{role.userCount}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(role.updatedAt).toLocaleDateString('fr-FR')}
                  {role.updatedBy && <span className="block text-[11px] text-slate-400">par {role.updatedBy.slice(0, 8)}…</span>}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/roles/${role.id}`} className="text-sm font-medium text-sky-700 hover:underline">
                    Détail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
