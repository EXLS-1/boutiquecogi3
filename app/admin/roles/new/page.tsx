// app/admin/roles/new/page.tsx
// ============================================================
// Création d'un rôle (niveaux 2-6, garde-fous policy).
// ============================================================

import type { Metadata } from 'next';

import { RoleModuleNav } from '@/components/admin/roles/RoleModuleNav';
import { RoleCreateForm } from '@/components/admin/roles/detail/RoleCreateForm';

export const metadata: Metadata = { title: 'Nouveau rôle | Admin', robots: 'noindex, nofollow' };

export default function NewRolePage() {
  return (
    <main className="container mx-auto max-w-3xl space-y-6 p-6">
      <RoleModuleNav />
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Nouveau rôle</h1>
        <p className="text-slate-600">
          Les niveaux 1 (SUPER_ADMIN) et 7 (GUEST) sont réservés par le RBAC.
        </p>
      </header>
      <RoleCreateForm />
    </main>
  );
}
