// components/dashboard/widgets/overview-stats.tsx
// ============================================
// WIDGET : STATISTIQUES GLOBALES (OVERVIEW)
// Permissions: analytics:read
// Niveaux: LEVEL 1-3 (Super-Admin, Admin, Manager)
// ============================================

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  getCurrentUserWithRole,
  hasPermission,
} from "@/lib/auth/rbac";
import {
  WidgetShell,
  WidgetSkeleton,
  WidgetForbidden,
  formatCurrency,
  formatNumber,
  type WidgetProps,
} from "@/lib/dashboard/widget-server-utils";
import { TrendingUp, TrendingDown, Users, ShoppingCart, Package, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ───────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────

interface StatItem {
  label: string;
  value: string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  trend: "up" | "down";
}

// ───────────────────────────────────────────
// DATA FETCHING (ATOMIQUE)
// ───────────────────────────────────────────

async function fetchOverviewStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers,
    prevNewUsers,
    totalOrders,
    recentOrders,
    prevOrders,
    totalProducts,
    recentRevenue,
    prevRevenue,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({
      where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.order.count({
      where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo }, status: "DELIVERED" },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        status: "DELIVERED",
      },
      _sum: { totalAmount: true },
    }),
  ]);

  const revenue = recentRevenue._sum.totalAmount ?? 0;
  const prevRevenueVal = prevRevenue._sum.totalAmount ?? 0;

  return {
    totalUsers,
    newUsers,
    prevNewUsers,
    totalOrders,
    recentOrders,
    prevOrders,
    totalProducts,
    revenue,
    prevRevenue: prevRevenueVal,
  };
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ───────────────────────────────────────────
// SOUS-COMPOSANT : CARTE STAT
// ───────────────────────────────────────────

function StatCard({ stat }: { stat: StatItem }) {
  const Icon = stat.icon;
  const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown;
  const trendColor =
    stat.trend === "up" ? "text-emerald-600" : "text-red-600";
  const badgeVariant = stat.trend === "up" ? "default" : "destructive";

  return (
    <div className="flex flex-col space-y-2 p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <Badge variant={badgeVariant} className="text-xs">
          <TrendIcon className="h-3 w-3 mr-1" />
          {stat.change > 0 ? "+" : ""}
          {stat.change}%
        </Badge>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
        <p className="text-xs text-muted-foreground">{stat.label}</p>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────
// CONTENU ASYNC (Server Component)
// ───────────────────────────────────────────

async function OverviewStatsContent({ className }: WidgetProps) {
  const userData = await getCurrentUserWithRole();

  if (!userData?.isAuthenticated) {
    return <WidgetForbidden title="Vue d'ensemble" />;
  }

  const { role } = userData;
  const allowed = await hasPermission(role, PERMISSIONS.ANALYTICS_READ);

  if (!allowed) {
    return <WidgetForbidden title="Vue d'ensemble" />;
  }

  const data = await fetchOverviewStats();

  const stats: StatItem[] = [
    {
      label: "Revenus (30j)",
      value: formatCurrency(data.revenue),
      change: calcChange(data.revenue, data.prevRevenue),
      icon: CreditCard,
      trend: data.revenue >= data.prevRevenue ? "up" : "down",
    },
    {
      label: "Nouveaux utilisateurs",
      value: formatNumber(data.newUsers),
      change: calcChange(data.newUsers, data.prevNewUsers),
      icon: Users,
      trend: data.newUsers >= data.prevNewUsers ? "up" : "down",
    },
    {
      label: "Commandes (30j)",
      value: formatNumber(data.recentOrders),
      change: calcChange(data.recentOrders, data.prevOrders),
      icon: ShoppingCart,
      trend: data.recentOrders >= data.prevOrders ? "up" : "down",
    },
    {
      label: "Produits actifs",
      value: formatNumber(data.totalProducts),
      change: 0,
      icon: Package,
      trend: "up",
    },
  ];

  return (
    <WidgetShell title="Vue d'ensemble" className={className}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>
    </WidgetShell>
  );
}

// ───────────────────────────────────────────
// EXPORT PUBLIC (avec Suspense)
// ───────────────────────────────────────────

export default function OverviewStats({ className }: WidgetProps) {
  return (
    <Suspense fallback={<WidgetSkeleton rows={2} />}>
      <OverviewStatsContent className={className} />
    </Suspense>
  );
}
