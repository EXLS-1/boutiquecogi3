// app/admin/role_permissions/page.tsx
// ============================================================
// Matrice globale rôle × permission + catalogue des permissions
// (catégories, permissions dangereuses, aperçu effectif).
// ============================================================

import Link from 'next/link';
import type { Metadata } from 'next';

import { RoleModuleNav } from '@/components/admin/roles/RoleModuleNav';
import { PermissionService } from '@/lib/admin/roles/permission.service';

export const metadata: Metadata = { title: 'Permissions des rôles | Admin', robots: 'noindex, nofollow' };
export const dynamic = 'force-dynamic';

export default async function RolePermissionsPage() {
  const [matrixResult, catalogResult] = await Promise.all([
    PermissionService.listMatrix(),
    PermissionService.listCatalog(),
  ]);

  const matrix = matrixResult.success ? matrixResult.data : [];
  const permissions = catalogResult.success ? catalogResult.data : [];
  const permissionById = new Map(permissions.map((p) => [p.id, p]));
  const categories = Array.from(new Set(permissions.map((p) => p.category))).sort();
  const dangerousCount = permissions.filter((p) => p.isDangerous).length;

  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-6">
      <RoleModuleNav />
      <header>
        <h1 className="text-3xl font-bold text-slate-950">Permissions</h1>
        <p className="mt-1 text-slate-600">
          Source de vérité : catalogue Permission → RolePermission (relation normalisée).
        </p>
      </header>

      <section className="grid grid-cols-3 gap-4">
        {[
          ['Permissions', permissions.length],
          ['Catégories', categories.length],
          ['Dangereuses', dangerousCount],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-950">{value}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </section>

      {!matrixResult.success && (
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">Erreur : {matrixResult.error}</p>
      )}

      {/* Matrice rôle × permission */}
      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Rôle</th>
              {categories.map((category) => (
                <th key={category} className="px-3 py-3 text-center">{category}</th>
              ))}
              <th className="px-3 py-3 text-center">Total</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {matrix.map((row) => (
              <tr key={row.roleId} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-950">
                  {row.roleName} <span className="font-mono text-xs text-slate-400">niv.{row.level}</span>
                </td>
                {categories.map((category) => {
                  const count = row.permissionIds.filter((id) => permissionById.get(id)?.category === category).length;
                  return (
                    <td key={category} className="px-3 py-3 text-center font-mono text-xs">
                      {count > 0 ? (
                        <span className={`rounded px-1.5 py-0.5 ${count >= 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{count}</span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-center font-semibold">{row.permissionIds.length}</td>
                <td className="px-3 py-3">
                  <Link href={`/admin/role_permissions/${row.roleId}`} className="text-sm font-medium text-sky-700 hover:underline">
                    Éditer
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Catalogue */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-950">Catalogue des permissions</h2>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {permissions.map((permission) => (
            <div key={permission.id} className="rounded-lg border border-slate-100 p-2 text-sm">
              <p className="font-mono text-xs text-slate-700">{permission.code}</p>
              <p className="text-slate-600">{permission.name}</p>
              <div className="mt-1 flex gap-1.5">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{permission.category}</span>
                {permission.isDangerous && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] text-red-700">dangereuse</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
