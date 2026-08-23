// app/admin/users/page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import { getAdminUsersData } from '@/lib/admin/users';
import { StatsCards } from '@/components/admin/users/stats-cards';
import { UsersTable } from '@/components/admin/users/users-table';

export default async function AdminUsersPage() {
  // Gestion d'erreur robuste (anti-fragile) : fallback sur des données vides si la BDD échoue
  const data = await getAdminUsersData().catch((error) => {
    console.error('Erreur lors du chargement des utilisateurs:', error);
    return { users: [], stats: { total: 0, verified: 0, twoFactor: 0, blocked: 0, deleted: 0 } };
  });

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      {/* En-tête */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Utilisateurs</h1>
          <p className="text-slate-500 mt-1">
            Visualisation et gestion de tous les comptes (actifs, bloqués, supprimés).
          </p>
        </div>
        <div className="gap-8">
        <Link
          href="/admin/account"
          className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cyan-600 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
        >
          Comptes
        </Link>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cyan-600 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
        >
          Portail Admin
        </Link>
        </div>
      </header>

      {/* Cartes de statistiques (Atomique) */}
      <StatsCards stats={data.stats} />

      {/* Tableau de données (Atomique + Suspense) */}
      <Suspense
        fallback={
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Chargement des données utilisateurs...
          </div>
        }
      >
        <UsersTable users={data.users} />
      </Suspense>
    </div>
  );
}
