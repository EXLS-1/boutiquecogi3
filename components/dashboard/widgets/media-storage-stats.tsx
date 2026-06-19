// components/dashboard/widgets/media-storage-stats.tsx
// ============================================
// WIDGET : STATISTIQUES STOCKAGE MÉDIA
// Permissions: media:read
// Niveaux: LEVEL 1-4 (Super-Admin → Editor)
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
  formatNumber,
  type WidgetProps,
} from "@/lib/dashboard/widget-server-utils";
import { HardDrive, Image, Video, FileText, Music } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// ───────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────

interface MediaStats {
  totalFiles: number;
  totalSizeBytes: number;
  byType: Record<string, { count: number; sizeBytes: number }>;
}

// ───────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getMediaIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes("image")) return Image;
  if (t.includes("video")) return Video;
  if (t.includes("audio")) return Music;
  return FileText;
}

function getMediaColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("image")) return "text-blue-500";
  if (t.includes("video")) return "text-red-500";
  if (t.includes("audio")) return "text-purple-500";
  return "text-gray-500";
}

// ───────────────────────────────────────────
// DATA FETCHING (ATOMIQUE)
// ───────────────────────────────────────────

async function fetchMediaStats(): Promise<MediaStats> {
  const files = await prisma.media.findMany({
    select: {
      mimeType: true,
      sizeBytes: true,
    },
  });

  const byType: Record<string, { count: number; sizeBytes: number }> = {};
  let totalSize = 0;

  for (const file of files) {
    const category = file.mimeType?.split("/")[0] ?? "unknown";
    if (!byType[category]) {
      byType[category] = { count: 0, sizeBytes: 0 };
    }
    byType[category].count++;
    byType[category].sizeBytes += file.sizeBytes ?? 0;
    totalSize += file.sizeBytes ?? 0;
  }

  return {
    totalFiles: files.length,
    totalSizeBytes: totalSize,
    byType,
  };
}

// ───────────────────────────────────────────
// CONTENU ASYNC
// ───────────────────────────────────────────

async function MediaStorageStatsContent({ className }: WidgetProps) {
  const userData = await getCurrentUserWithRole();

  if (!userData?.isAuthenticated) {
    return <WidgetForbidden title="Stockage média" />;
  }

  const { role } = userData;
  const allowed = await hasPermission(role, PERMISSIONS.MEDIA_READ);

  if (!allowed) {
    return <WidgetForbidden title="Stockage média" />;
  }

  const stats = await fetchMediaStats();

  const typeEntries = Object.entries(stats.byType).sort(
    (a, b) => b[1].sizeBytes - a[1].sizeBytes
  );

  // Simulation d'une limite de stockage (à adapter selon votre config)
  const storageLimit = 10 * 1024 * 1024 * 1024; // 10 GB
  const usagePercent = Math.min(
    (stats.totalSizeBytes / storageLimit) * 100,
    100
  );

  return (
    <WidgetShell title="Stockage média" icon={HardDrive} className={className}>
      <div className="space-y-4">
        {/* Résumé global */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{formatBytes(stats.totalSizeBytes)}</p>
            <p className="text-xs text-muted-foreground">
              {formatNumber(stats.totalFiles)} fichiers
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Limite</p>
            <p className="text-sm font-medium">{formatBytes(storageLimit)}</p>
          </div>
        </div>

        <Progress value={usagePercent} className="h-2" />
        <p className="text-xs text-muted-foreground text-right">
          {usagePercent.toFixed(1)}% utilisé
        </p>

        {/* Répartition par type */}
        <div className="space-y-2 pt-2">
          {typeEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun fichier média.
            </p>
          ) : (
            typeEntries.map(([type, data]) => {
              const Icon = getMediaIcon(type);
              const color = getMediaColor(type);
              const typePercent =
                stats.totalSizeBytes > 0
                  ? (data.sizeBytes / stats.totalSizeBytes) * 100
                  : 0;

              return (
                <div key={type} className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium capitalize">{type}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatNumber(data.count)} fichiers
                      </span>
                    </div>
                    <Progress value={typePercent} className="h-1" />
                  </div>
                  <span className="text-xs font-medium tabular-nums shrink-0 w-16 text-right">
                    {formatBytes(data.sizeBytes)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </WidgetShell>
  );
}

// ───────────────────────────────────────────
// EXPORT PUBLIC
// ───────────────────────────────────────────

export default function MediaStorageStats({ className }: WidgetProps) {
  return (
    <Suspense fallback={<WidgetSkeleton rows={4} />}>
      <MediaStorageStatsContent className={className} />
    </Suspense>
  );
}
