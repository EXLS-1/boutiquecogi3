// app/admin/role_restrictions/[roleId]/page.tsx
// ============================================================
// Édition des restrictions d'un rôle (validation Zod stricte,
// catégories déjà définies par le RBAC).
// ============================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { RoleModuleNav } from '@/components/admin/roles/RoleModuleNav';
import { RoleRestrictionsEditor } from '@/components/admin/roles/detail/RoleRestrictionsEditor';
import { RoleService } from '@/lib/admin/roles/role.service';
import { RestrictionService } from '@/lib/admin/roles/restriction.service';

export const metadata: Metadata = { title: 'Restrictions du rôle | Admin', robots: 'noindex, nofollow' };
export const dynamic = 'force-dynamic';

export default async function RoleRestrictionsDetailPage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;
  const [roleResult, restrictionsResult] = await Promise.all([
    RoleService.getRole(roleId),
    RestrictionService.getRestrictions(roleId),
  ]);

  if (!roleResult.success) notFound();
  const role = roleResult.data;
  const restrictions = restrictionsResult.success
    ? (restrictionsResult.data as Record<string, unknown>)
    : {};

  return (
    <main className="container mx-auto max-w-4xl space-y-6 p-6">
      <RoleModuleNav />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/role_restrictions" className="text-sm text-sky-700 hover:underline">← Retour aux restrictions</Link>
          <h1 className="text-3xl font-bold text-slate-950">Restrictions · {role.name}</h1>
          <p className="mt-1 text-slate-600">
            Niveau {role.level} · {role.isBlocked ? 'rôle bloqué (lecture seule).' : 'rôle modifiable.'}
          </p>
        </div>
        <Link href={`/admin/roles/${role.id}`} className="text-sm font-medium text-sky-700 hover:underline">
          Configuration du rôle →
        </Link>
      </header>

      <RoleRestrictionsEditor roleId={role.id} restrictions={restrictions} />
    </main>
  );
}
