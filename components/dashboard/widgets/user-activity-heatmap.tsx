// components/dashboard/widgets/user-activity-heatmap.tsx
// ============================================
// WIDGET : CARTE DE CHALEUR ACTIVITÉ UTILISATEURS
// Permissions: analytics:read + users:read
// Niveaux: LEVEL 1-3 (Super-Admin, Admin, Manager)
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
  type WidgetProps,
} from "@/lib/dashboard/widget-server-utils";
import { Activity } from "lucide-react";

// ───────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────

interface HeatmapCell {
  day: number; // 0-6 (Dim-Sam)
  hour: number; // 0-23
  intensity: number; // 0-4
  count: number;
}

// ───────────────────────────────────────────
// DATA FETCHING (ATOMIQUE)
// ───────────────────────────────────────────

async function fetchActivityHeatmap(): Promise<HeatmapCell[]> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const sessions = await prisma.session.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      createdAt: true,
    },
  });

  const grid = new Map<string, number>();

  for (const session of sessions) {
    const date = new Date(session.createdAt);
    const day = date.getDay();
    const hour = date.getHours();
    const key = `${day}-${hour}`;
    grid.set(key, (grid.get(key) ?? 0) + 1);
  }

  const maxValue = Math.max(...grid.values(), 1);

  const cells: HeatmapCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const count = grid.get(`${day}-${hour}`) ?? 0;
      const normalized = count / maxValue;
      let intensity = 0;
      if (normalized > 0.75) intensity = 4;
      else if (normalized > 0.5) intensity = 3;
      else if (normalized > 0.25) intensity = 2;
      else if (normalized > 0) intensity = 1;

      cells.push({ day, hour, intensity, count });
    }
  }

  return cells;
}

// ───────────────────────────────────────────
// HEATMAP SVG (Server-rendered)
// ───────────────────────────────────────────

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const HOUR_LABELS = ["00", "06", "12", "18"];

const INTENSITY_COLORS = [
  "hsl(var(--muted) / 0.3)",
  "hsl(var(--primary) / 0.25)",
  "hsl(var(--primary) / 0.5)",
  "hsl(var(--primary) / 0.75)",
  "hsl(var(--primary))",
];

function HeatmapGrid({ cells }: { cells: HeatmapCell[] }) {
  const cellSize = 10;
  const gap = 2;

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[400px]">
        <div className="flex items-center mb-1 ml-8">
          {HOUR_LABELS.map((h) => (
            <span
              key={h}
              className="text-[9px] text-muted-foreground"
              style={{ width: `${6 * (cellSize + gap)}px`, textAlign: "center" }}
            >
              {h}h
            </span>
          ))}
        </div>

        <div className="flex">
          <div className="flex flex-col justify-around mr-2 py-1">
            {DAY_LABELS.map((d) => (
              <span key={d} className="text-[9px] text-muted-foreground h-[10px] leading-[10px]">
                {d}
              </span>
            ))}
          </div>

          <div
            className="grid gap-[2px]"
            style={{
              gridTemplateColumns: `repeat(24, ${cellSize}px)`,
              gridTemplateRows: `repeat(7, ${cellSize}px)`,
            }}
          >
            {cells.map((cell) => (
              <div
                key={`${cell.day}-${cell.hour}`}
                className="rounded-sm transition-colors"
                style={{
                  backgroundColor: INTENSITY_COLORS[cell.intensity],
                  width: cellSize,
                  height: cellSize,
                }}
                title={`${DAY_LABELS[cell.day]} ${cell.hour}h: ${cell.count} activités`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-2">
          <span className="text-[9px] text-muted-foreground">Faible</span>
          {INTENSITY_COLORS.map((color, i) => (
            <div
              key={i}
              className="rounded-sm"
              style={{
                backgroundColor: color,
                width: cellSize,
                height: cellSize,
              }}
            />
          ))}
          <span className="text-[9px] text-muted-foreground">Intense</span>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────
// CONTENU ASYNC
// ───────────────────────────────────────────

async function UserActivityHeatmapContent({ className }: WidgetProps) {
  const userData = await getCurrentUserWithRole();

  if (!userData?.isAuthenticated) {
    return <WidgetForbidden title="Activité utilisateurs" />;
  }

  const { role } = userData;
  const allowed = await hasAllPermissions(role, [
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.USERS_READ,
  ]);

  if (!allowed) {
    return <WidgetForbidden title="Activité utilisateurs" />;
  }

  const cells = await fetchActivityHeatmap();

  return (
    <WidgetShell
      title="Activité utilisateurs (30j)"
      icon={Activity}
      className={className}
    >
      <HeatmapGrid cells={cells} />
    </WidgetShell>
  );
}

// ───────────────────────────────────────────
// EXPORT PUBLIC
// ───────────────────────────────────────────

export default function UserActivityHeatmap({ className }: WidgetProps) {
  return (
    <Suspense fallback={<WidgetSkeleton rows={4} />}>
      <UserActivityHeatmapContent className={className} />
    </Suspense>
  );
}
