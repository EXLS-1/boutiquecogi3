// components/dashboard/widgets/category-breakdown.tsx
// ============================================
// WIDGET : RÉPARTITION PAR CATÉGORIE
// Permissions: categories:read + analytics:read
// Niveaux: LEVEL 1-4 (Super-Admin → Editor)
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
  formatNumber,
  type WidgetProps,
} from "@/lib/dashboard/widget-server-utils";
import { PieChart } from "lucide-react";

// ───────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────

interface CategoryData {
  name: string;
  count: number;
  color: string;
}

// ───────────────────────────────────────────
// PALETTE
// ───────────────────────────────────────────

const CATEGORY_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
];

// ───────────────────────────────────────────
// DATA FETCHING (ATOMIQUE)
// ───────────────────────────────────────────

async function fetchCategoryBreakdown(): Promise<CategoryData[]> {
  const categories = await prisma.category.findMany({
    select: {
      name: true,
      _count: {
        select: { products: true },
      },
    },
    orderBy: { products: { _count: "desc" } },
    take: 8,
  });

  return categories.map((cat, i) => ({
    name: cat.name,
    count: cat._count.products,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));
}

// ───────────────────────────────────────────
// GRAPHIQUE SVG DONUT (Server-rendered)
// ───────────────────────────────────────────

function DonutChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return null;

  const size = 140;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((segment) => {
            const percentage = segment.count / total;
            const dashLength = percentage * circumference;
            const segmentOffset = offset;
            offset += dashLength;

            return (
              <circle
                key={segment.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={-segmentOffset}
                className="transition-all duration-300"
              >
                <title>
                  {segment.name}: {segment.count} produits ({Math.round(percentage * 100)}%)
                </title>
              </circle>
            );
          })}
        </g>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground text-sm font-bold"
        >
          {total}
        </text>
        <text
          x="50%"
          y="60%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted-foreground text-[10px]"
        >
          produits
        </text>
      </svg>

      <div className="flex-1 space-y-2 min-w-0">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs truncate flex-1">{item.name}</span>
            <span className="text-xs font-medium tabular-nums">
              {formatNumber(item.count)}
            </span>
            <span className="text-[10px] text-muted-foreground w-8 text-right">
              {Math.round((item.count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────
// CONTENU ASYNC
// ───────────────────────────────────────────

async function CategoryBreakdownContent({ className }: WidgetProps) {
  const userData = await getCurrentUserWithRole();

  if (!userData?.isAuthenticated) {
    return <WidgetForbidden title="Répartition catégories" />;
  }

  const { role } = userData;
  const allowed = await hasAllPermissions(role, [
    PERMISSIONS.CATEGORIES_READ,
    PERMISSIONS.ANALYTICS_READ,
  ]);

  if (!allowed) {
    return <WidgetForbidden title="Répartition catégories" />;
  }

  const data = await fetchCategoryBreakdown();

  return (
    <WidgetShell
      title="Répartition par catégorie"
      icon={PieChart}
      className={className}
    >
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Aucune catégorie trouvée.
        </p>
      ) : (
        <DonutChart data={data} />
      )}
    </WidgetShell>
  );
}

// ───────────────────────────────────────────
// EXPORT PUBLIC
// ───────────────────────────────────────────

export default function CategoryBreakdown({ className }: WidgetProps) {
  return (
    <Suspense fallback={<WidgetSkeleton rows={4} />}>
      <CategoryBreakdownContent className={className} />
    </Suspense>
  );
}
