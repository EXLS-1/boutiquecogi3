// components/admin/accounts/account-stats.tsx
import type { AccountStats } from '@/lib/super_admin/accounts';

const STAT_CONFIG = [
  { label: 'Total comptes', key: 'total', color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Utilisateurs uniques', key: 'uniqueUsers', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Fournisseurs', key: 'providersCount', color: 'text-purple-600', bg: 'bg-purple-50' },
  { label: 'Avec mot de passe', key: 'withPassword', color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Refresh Token actif', key: 'withRefreshToken', color: 'text-rose-600', bg: 'bg-rose-50' },
] as const;

export function AccountStats({ stats }: { stats: AccountStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {STAT_CONFIG.map((stat) => (
        <div key={stat.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-slate-500">{stat.label}</p>
          <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stats[stat.key]}</p>
        </div>
      ))}
    </div>
  );
}
