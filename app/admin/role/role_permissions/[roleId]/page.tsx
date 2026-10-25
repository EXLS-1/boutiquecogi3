// app/admin/role_permissions/[roleId]/page.tsx
// ============================================================
// Édition de la matrice permissions d'un rôle + aperçu des
// permissions effectives (propres, héritées, obligatoires).
// ============================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { RoleModuleNav } from '@/components/admin/roles/RoleModuleNav';
import { RolePermissionsEditor } from '@/components/admin/roles/detail/RolePermissionsEditor';
import { RoleService } from '@/lib/admin/roles/role.service';
import { PermissionService } from '@/lib/admin/roles/permission.service';

export const metadata: Metadata = { title: 'Permissions du rôle | Admin', robots: 'noindex, nofollow' };
export const dynamic = 'force-dynamic';

export default async function RolePermissionsDetailPage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;
  const [roleResult, catalogResult, effectiveResult] = await Promise.all([
    RoleService.getRole(roleId),
    PermissionService.listCatalog(),
    PermissionService.listEffective(roleId),
  ]);

  if (!roleResult.success) notFound();
  const role = roleResult.data;
  const permissions = catalogResult.success ? catalogResult.data : [];

  // Sélection courante = ids des permissions propres au rôle.
  const selectedIds = effectiveResult.success
    ? permissions
        .filter((p) => effectiveResult.data.own.includes(p.code))
        .map((p) => p.id)
    : [];
  const inheritedCodes = effectiveResult.success ? effectiveResult.data.inherited : [];
  const effectiveCodes = effectiveResult.success ? effectiveResult.data.effective : [];
  const missingMandatory = effectiveResult.success ? effectiveResult.data.missingMandatory : [];

  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-6">
      <RoleModuleNav />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/role_permissions" className="text-sm text-sky-700 hover:underline">← Retour à la matrice</Link>
          <h1 className="text-3xl font-bold text-slate-950">Permissions · {role.name}</h1>
          <p className="mt-1 text-slate-600">
            Niveau {role.level} · {role.userCount} utilisateur(s) ·
            {role.isBlocked ? ' rôle bloqué (lecture seule).' : ' rôle modifiable.'}
          </p>
        </div>
        <Link href={`/admin/roles/${role.id}`} className="text-sm font-medium text-sky-700 hover:underline">
          Configuration du rôle →
        </Link>
      </header>

      <RolePermissionsEditor
        roleId={role.id}
        permissions={permissions}
        selectedIds={selectedIds}
        inheritedCodes={inheritedCodes}
        effectiveCodes={effectiveCodes}
        missingMandatory={missingMandatory}
      />
    </main>
  );
}
