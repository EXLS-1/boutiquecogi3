// components/dashboard/widgets/treasury-summary.tsx
// ============================================
// WIDGET : RÉSUMÉ TRÉSORERIE
// Permissions: analytics:read + settings:billing
// Niveaux: LEVEL 1-2 (Super-Admin, Admin)
// ============================================

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  getCurrentUserWithRole,
  hasAllPermissions,
} from "@/lib/auth/rbac";
import {
  WidgetShell,
  WidgetSkeleton,
  WidgetForbidden,
  formatCurrency,
  getDateRange,
  type WidgetProps,
  type TimeRange,
} from "@/lib/dashboard/widget-server-utils";
import { Wallet, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ───────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────

interface TreasuryData {
  totalRevenue: number;
  pendingRevenue: number;
  refundedAmount: number;
  netRevenue: number;
  avgOrderValue: number;
  transactionCount: number;
}

// ───────────────────────────────────────────
// DATA FETCHING (ATOMIQUE)
// ───────────────────────────────────────────

async function fetchTreasuryData(range: TimeRange): Promise<TreasuryData> {
  const { start, end } = getDateRange(range);

  const [completed, pending, refunded, avgOrder, count] = await Promise.all([
    prisma.order.aggregate({
      where: {
        createdAt: { gte: start, lte: end },
        status: "DELIVERED",
      },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: start, lte: end },
        status: { in: ["PENDING", "PROCESSING"] },
      },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: start, lte: end },
        status: "REFUNDED",
      },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: start, lte: end },
        status: "DELIVERED",
      },
      _avg: { totalAmount: true },
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: start, lte: end },
      },
    }),
  ]);

  const totalRevenue = completed._sum.totalAmount ?? 0;
  const pendingRevenue = pending._sum.totalAmount ?? 0;
  const refundedAmount = refunded._sum.totalAmount ?? 0;

  return {
    totalRevenue,
    pendingRevenue,
    refundedAmount,
    netRevenue: totalRevenue - refundedAmount,
    avgOrderValue: avgOrder._avg.totalAmount ?? 0,
    transactionCount: count,
  };
}

// ───────────────────────────────────────────
// CONTENU ASYNC
// ───────────────────────────────────────────

async function TreasurySummaryContent({
  className,
  range = "30d",
}: WidgetProps & { range?: TimeRange }) {
  const userData = await getCurrentUserWithRole();

  if (!userData?.isAuthenticated) {
    return <WidgetForbidden title="Trésorerie" />;
  }

  const { role } = userData;
  const allowed = await hasAllPermissions(role, [
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.SETTINGS_BILLING,
  ]);

  if (!allowed) {
    return <WidgetForbidden title="Trésorerie" />;
  }

  const data = await fetchTreasuryData(range);

  const metrics = [
    {
      label: "Revenus nets",
      value: data.netRevenue,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "En attente",
      value: data.pendingRevenue,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Remboursements",
      value: data.refundedAmount,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Panier moyen",
      value: data.avgOrderValue,
      icon: Wallet,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
  ];

  return (
    <WidgetShell title="Trésorerie" icon={Wallet} className={className}>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={`p-3 rounded-lg ${metric.bgColor} border`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${metric.color}`} />
                <span className="text-xs text-muted-foreground">{metric.label}</span>
              </div>
              <p className={`text-lg font-bold ${metric.color}`}>
                {formatCurrency(metric.value)}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{data.transactionCount} transactions</span>
        <Badge variant="outline" className="text-[10px]">
          {range === "7d" ? "7 jours" : range === "30d" ? "30 jours" : range === "90d" ? "90 jours" : "1 an"}
        </Badge>
      </div>
    </WidgetShell>
  );
}

// ───────────────────────────────────────────
// EXPORT PUBLIC
// ───────────────────────────────────────────

export default function TreasurySummary({
  className,
  range,
}: WidgetProps & { range?: TimeRange }) {
  return (
    <Suspense fallback={<WidgetSkeleton rows={3} />}>
      <TreasurySummaryContent className={className} range={range} />
    </Suspense>
  );
}
