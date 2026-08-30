// components/admin/users/stats-cards.tsx

import { Users, CheckCircle, ShieldCheck, ShieldAlert, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Import du type existant. 
// Note : Assurez-vous que ce type contient bien les clés : total, verified, twoFactor, blocked, deleted
import type { UsersStats } from '@/lib/super_admin/users';

// ============================================================================
// 1. CONFIGURATION (DRY, modulaire et facilement maintenable)
// ============================================================================
type StatKey = keyof UsersStats;

interface StatConfig {
  key: StatKey;
  label: string;
  icon: React.ElementType;
  textColor: string;
  iconBg: string;
  iconColor: string;
}

const STAT_CONFIG: readonly StatConfig[] = [
  {
    key: 'total',
    label: 'Total utilisateurs',
    icon: Users,
    textColor: 'text-slate-900',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
  {
    key: 'verified',
    label: 'Emails vérifiés',
    icon: CheckCircle,
    textColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    key: 'twoFactor',
    label: '2FA activé',
    icon: ShieldCheck,
    textColor: 'text-purple-600',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    key: 'blocked',
    label: 'Comptes bloqués',
    icon: ShieldAlert,
    textColor: 'text-red-600',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
  },
  {
    key: 'deleted',
    label: 'Comptes supprimés',
    icon: Trash2,
    textColor: 'text-slate-600',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
] as const;

// ============================================================================
// 2. COMPOSANT (Atomique, accessible et anti-fragile)
// ============================================================================
interface StatsCardsProps {
  stats: UsersStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  // Programmation défensive : fallback sur des valeurs par défaut si `stats` est partiel ou undefined
  const safeStats: UsersStats = stats ?? {
    total: 0,
    verified: 0,
    twoFactor: 0,
    blocked: 0,
    deleted: 0,
  } as UsersStats;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5" role="region" aria-label="Statistiques des utilisateurs">
      {STAT_CONFIG.map((stat) => {
        const Icon = stat.icon;
        // Fallback supplémentaire au niveau de la clé pour éviter les undefined à l'affichage
        const rawValue = safeStats[stat.key];
        const value = typeof rawValue === 'number' ? rawValue : 0;

        return (
          <Card 
            key={stat.key} 
            className="transition-all duration-200 hover:shadow-md border-slate-200"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.label}
              </CardTitle>
              <div className={`rounded-full p-1.5 ${stat.iconBg}`}>
                <Icon className={`h-4 w-4 ${stat.iconColor}`} aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold tabular-nums tracking-tight ${stat.textColor}`}>
                {value.toLocaleString('fr-FR')}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
