// components/dashboard/widgets/revenue-chart.tsx
// ============================================
// WIDGET : GRAPHIQUE DES REVENUS
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
  getDateRange,
  type WidgetProps,
  type TimeRange,
} from "@/lib/dashboard/widget-server-utils";
import { BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ───────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────

interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

// ───────────────────────────────────────────
// DATA FETCHING (ATOMIQUE)
// ───────────────────────────────────────────

async function fetchRevenueData(range: TimeRange): Promise<RevenuePoint[]> {
  const { start, end } = getDateRange(range);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      status: "COMPLETED",
    },
    select: {
      createdAt: true,
      totalAmount: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Grouper par jour
  const grouped = new Map<string, { revenue: number; orders: number }>();

  for (const order of orders) {
    const dateKey = order.createdAt.toISOString().split("T")[0];
    const existing = grouped.get(dateKey) ?? { revenue: 0, orders: 0 };
    grouped.set(dateKey, {
      revenue: existing.revenue + (order.totalAmount ?? 0),
      orders: existing.orders + 1,
    });
  }

  // Remplir les jours manquants
  const result: RevenuePoint[] = [];
  const current = new Date(start);
  while (current <= end) {
    const key = current.toISOString().split("T")[0];
    const data = grouped.get(key) ?? { revenue: 0, orders: 0 };
    result.push({
      date: key,
      revenue: data.revenue,
      orders: data.orders,
    });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

// ───────────────────────────────────────────
// GRAPHIQUE SVG (Server-rendered, pas de Recharts)
// ───────────────────────────────────────────

function SimpleBarChart({ data }: { data: RevenuePoint[] }) {
  if (data.length === 0) return null;

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const chartHeight = 160;
  const barWidth = Math.max(4, Math.min(24, 600 / data.length));
  const gap = 2;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${data.length * (barWidth + gap)} ${chartHeight + 40}`}
        className="w-full min-w-[300px]"
        preserveAspectRatio="none"
      >
        {/* Axes */}
        <line
          x1="0"
          y1={chartHeight}
          x2={data.length * (barWidth + gap)}
          y2={chartHeight}
          stroke="currentColor"
          strokeOpacity="0.2"
        />
        {/* Barres */}
        {data.map((point, i) => {
          const barHeight = (point.revenue / maxRevenue) * chartHeight;
          const x = i * (barWidth + gap);
          const y = chartHeight - barHeight;

          return (
            <g key={point.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                className="fill-primary"
                rx={2}
                opacity={0.8 + (i % 2) * 0.1}
              />
              {/* Tooltip sur hover (title SVG natif) */}
              <title>
                {point.date}: {formatCurrency(point.revenue)} ({point.orders} cmd)
              </title>
            </g>
          );
        })}
        {/* Labels X (tous les N jours) */}
        {data.map((point, i) => {
          const step = Math.ceil(data.length / 6);
          if (i % step !== 0 && i !== data.length - 1) return null;
          const x = i * (barWidth + gap) + barWidth / 2;
          const label = new Date(point.date).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
          });
          return (
            <text
              key={`label-${i}`}
              x={x}
              y={chartHeight + 20}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ───────────────────────────────────────────
// CONTENU ASYNC
// ───────────────────────────────────────────

async function RevenueChartContent({
  className,
  range = "30d",
}: WidgetProps & { range?: TimeRange }) {
  const userData = await getCurrentUserWithRole();

  if (!userData?.isAuthenticated) {
    return <WidgetForbidden title="Revenus" />;
  }

  const { role } = userData;
  const allowed = await hasPermission(role, PERMISSIONS.ANALYTICS_READ);

  if (!allowed) {
    return <WidgetForbidden title="Revenus" />;
  }

  const data = await fetchRevenueData(range);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);

  return (
    <WidgetShell
      title="Évolution des revenus"
      icon={BarChart3}
      className={className}
      action={
        <form action="/dashboard" method="GET" className="flex items-center">
          <input type="hidden" name="tab" value="analytics" />
          <Select name="range" defaultValue={range}>
            <SelectTrigger className="h-7 w-[100px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 jours</SelectItem>
              <SelectItem value="30d">30 jours</SelectItem>
              <SelectItem value="90d">90 jours</SelectItem>
              <SelectItem value="1y">1 an</SelectItem>
            </SelectContent>
          </Select>
        </form>
      }
    >
      <div className="flex items-baseline gap-4 mb-4">
        <span className="text-2xl font-bold">{formatCurrency(totalRevenue)}</span>
        <span className="text-sm text-muted-foreground">
          {totalOrders} commandes
        </span>
      </div>
      <SimpleBarChart data={data} />
    </WidgetShell>
  );
}

// ───────────────────────────────────────────
// EXPORT PUBLIC
// ───────────────────────────────────────────

export default function RevenueChart({
  className,
  range,
}: WidgetProps & { range?: TimeRange }) {
  return (
    <Suspense fallback={<WidgetSkeleton rows={4} />}>
      <RevenueChartContent className={className} range={range} />
    </Suspense>
  );
}
