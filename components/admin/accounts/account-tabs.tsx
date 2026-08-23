// components/admin/accounts/account-tabs.tsx
'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export function AccountTabs({ currentTab }: { currentTab: 'active' | 'deleted' }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createLink = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    params.delete('page'); // Reset pagination on tab change
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="border-b border-slate-200">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        <Link
          href={createLink('active')}
          className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
            currentTab === 'active'
              ? 'border-cyan-500 text-cyan-600'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
          }`}
        >
          Comptes Actifs
        </Link>
        <Link
          href={createLink('deleted')}
          className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
            currentTab === 'deleted'
              ? 'border-cyan-500 text-cyan-600'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
          }`}
        >
          Registre des Supprimés
        </Link>
      </nav>
    </div>
  );
}
