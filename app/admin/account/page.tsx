// app/admin/account/page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import { getActiveAccountsData, getDeletedAccountsData } from '@/lib/admin/accounts';
import { AccountStats } from '@/components/admin/accounts/account-stats';
import { AccountTabs } from '@/components/admin/accounts/account-tabs';
import { ActiveAccountsTable } from '@/components/admin/accounts/active-accounts-table';
import { DeletedAccountsTable } from '@/components/admin/accounts/deleted-accounts-table';
import { Shield, History } from 'lucide-react';

interface SearchParams {
  tab?: 'active' | 'deleted';
  page?: string;
  pageSize?: string;
  search?: string;
  provider?: string;
  type?: string;
}

export default async function AdminAccountPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const tab = params.tab === 'deleted' ? 'deleted' : 'active';
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 25;

  // Chargement conditionnel et optimisé selon l'onglet actif
  const dataPromise = tab === 'active' 
    ? getActiveAccountsData({ page, pageSize, search: params.search, provider: params.provider, type: params.type })
    : getDeletedAccountsData({ page, pageSize });

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      {/* En-tête unifié */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            {tab === 'active' ? <Shield className="w-7 h-7 text-slate-700" /> : <History className="w-7 h-7 text-slate-700" />}
            {tab === 'active' ? 'Gestion des comptes' : 'Registre des comptes supprimés'}
          </h1>
          <p className="text-slate-500 mt-1">
            {tab === 'active' 
              ? 'Gérez les comptes d\'authentification liés aux utilisateurs.' 
              : 'Consultez l\'historique des suppressions et restaurez les comptes si nécessaire.'}
          </p>
        </div>
        <div className="gap-8">
        <Link
          href="/admin/users"
          className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cyan-600 active:scale-95"
        >
          Utilisateurs
        </Link>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cyan-600 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
        >
          Portail Admin
        </Link>
        </div>

      </header>

      {/* Navigation par onglets */}
      <AccountTabs currentTab={tab} />

      {/* Contenu dynamique avec Suspense */}
      <Suspense fallback={<div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Chargement des données...</div>}>
        <AccountContent tab={tab} dataPromise={dataPromise} params={params} />
      </Suspense>
    </div>
  );
}

// Composant interne pour gérer le rendu conditionnel proprement
async function AccountContent({ tab, dataPromise, params }: { 
  tab: 'active' | 'deleted'; 
  dataPromise: Promise<any>; 
  params: SearchParams 
}) {
  const data = await dataPromise.catch(() => null);
  if (!data) return <div className="text-red-600">Erreur de chargement des données.</div>;

  if (tab === 'active') {
    return (
      <>
        <AccountStats stats={data.stats} />
        <ActiveAccountsTable 
          accounts={data.accounts} 
          pagination={{ total: data.total, page: data.page, pageSize: data.pageSize, totalPages: data.totalPages }}
          providers={['credentials', 'google', 'github']} // À remplacer par getDistinctProvidersAction() si nécessaire
          filters={{ search: params.search, provider: params.provider, type: params.type }}
        />
      </>
    );
  }

  return (
    <DeletedAccountsTable 
      entries={data.entries} 
      pagination={{ total: data.total, page: data.page, pageSize: data.pageSize, totalPages: data.totalPages }} 
    />
  );
}
