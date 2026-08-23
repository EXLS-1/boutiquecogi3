// components/admin/users/stats-cards.tsx
import type { UsersStats } from '@/lib/admin/users';

const STAT_CONFIG = [
  { label: 'Total utilisateurs', key: 'total', color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Emails vérifiés', key: 'verified', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: '2FA activé', key: 'twoFactor', color: 'text-purple-600', bg: 'bg-purple-50' },
  { label: 'Comptes bloqués', key: 'blocked', color: 'text-red-600', bg: 'bg-red-50' },
  { label: 'Comptes supprimés', key: 'deleted', color: 'text-slate-600', bg: 'bg-slate-100' },
] as const;

export function StatsCards({ stats }: { stats: UsersStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {STAT_CONFIG.map((stat) => (
        <div
          key={stat.key}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="text-sm font-medium text-slate-500">{stat.label}</p>
          <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stats[stat.key]}</p>
        </div>
      ))}
    </div>
  );
}
