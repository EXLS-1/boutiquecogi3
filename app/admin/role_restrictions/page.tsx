// app/admin/role_restrictions/page.tsx
// ============================================================
// Liste des restrictions par rôle (quotas, rate limit, API,
// webhooks, analytics, export, bulk, 2FA, session, approbation).
// ============================================================

import Link from 'next/link';
import type { Metadata } from 'next';

import { RoleModuleNav } from '@/components/admin/roles/RoleModuleNav';
import { RoleService } from '@/lib/admin/roles/role.service';

export const metadata: Metadata = { title: 'Restrictions des rôles | Admin', robots: 'noindex, nofollow' };
export const dynamic = 'force-dynamic';

export default async function RoleRestrictionsPage() {
  const result = await RoleService.listRoles();
  const roles = result.success ? result.data : [];

  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-6">
      <RoleModuleNav />
      <header>
        <h1 className="text-3xl font-bold text-slate-950">Restrictions</h1>
        <p className="mt-1 text-slate-600">
          Seules les clés validées par le schéma Zod (aligné sur le RBAC) peuvent être modifiées.
        </p>
      </header>

      {!result.success && (
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">Erreur : {result.error}</p>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => {
          const entries = Object.entries(role.restrictions);
          return (
            <div key={role.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-950">
                    {role.name} <span className="font-mono text-xs text-slate-400">niv.{role.level}</span>
                  </p>
                  <p className="text-xs text-slate-500">{entries.length} restriction(s) explicite(s)</p>
                </div>
                <Link href={`/admin/role_restrictions/${role.id}`} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                  Éditer
                </Link>
              </div>
              {entries.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {entries.map(([key, value]) => (
                    <span key={key} className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                      {key}={String(value)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Défauts du RBAC (aucune restriction explicite).</p>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
