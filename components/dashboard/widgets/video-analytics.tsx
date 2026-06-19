// components/dashboard/widgets/video-analytics.tsx
// ============================================
// WIDGET : ANALYTIQUES VIDÉO
// Permissions: analytics:read + media:read
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
  formatCurrency,
  type WidgetProps,
} from "@/lib/dashboard/widget-server-utils";
import { Play, Eye, Clock, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// ───────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────

interface VideoMetric {
  videoId: string;
  title: string;
  views: number;
  avgWatchTime: number;
  completionRate: number;
  revenue: number;
}

interface VideoStats {
  totalVideos: number;
  totalViews: number;
  totalWatchTime: number;
  topVideos: VideoMetric[];
}

// ───────────────────────────────────────────
// DATA FETCHING (ATOMIQUE)
// ───────────────────────────────────────────

async function fetchVideoStats(): Promise<VideoStats> {
  const videos = await prisma.mediaFile.findMany({
    where: {
      mimeType: { startsWith: "video/" },
    },
    select: {
      id: true,
      name: true,
      metadata: true,
    },
    take: 10,
  });

  // Simulation de métriques vidéo (à adapter avec votre table d'analytics)
  const totalViews = videos.reduce((sum, v) => {
    const meta = v.metadata as Record<string, unknown> | null;
    return sum + (typeof meta?.views === "number" ? meta.views : 0);
  }, 0);

  const topVideos: VideoMetric[] = videos.map((video) => {
    const meta = video.metadata as Record<string, unknown> | null;
    const views = typeof meta?.views === "number" ? meta.views : 0;
    const avgWatch = typeof meta?.avgWatchTime === "number" ? meta.avgWatchTime : 0;
    const completion = typeof meta?.completionRate === "number" ? meta.completionRate : 0;

    return {
      videoId: video.id,
      title: video.name,
      views,
      avgWatchTime: avgWatch,
      completionRate: completion,
      revenue: 0, // À calculer selon votre logique
    };
  }).sort((a, b) => b.views - a.views).slice(0, 5);

  return {
    totalVideos: videos.length,
    totalViews,
    totalWatchTime: topVideos.reduce((sum, v) => sum + v.avgWatchTime * v.views, 0),
    topVideos,
  };
}

// ───────────────────────────────────────────
// CONTENU ASYNC
// ───────────────────────────────────────────

async function VideoAnalyticsContent({ className }: WidgetProps) {
  const userData = await getCurrentUserWithRole();

  if (!userData?.isAuthenticated) {
    return <WidgetForbidden title="Analytics vidéo" />;
  }

  const { role } = userData;
  const allowed = await hasAllPermissions(role, [
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.MEDIA_READ,
  ]);

  if (!allowed) {
    return <WidgetForbidden title="Analytics vidéo" />;
  }

  const stats = await fetchVideoStats();

  return (
    <WidgetShell title="Analytics vidéo" icon={Play} className={className}>
      <div className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{formatNumber(stats.totalVideos)}</p>
            <p className="text-[10px] text-muted-foreground">Vidéos</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{formatNumber(stats.totalViews)}</p>
            <p className="text-[10px] text-muted-foreground">Vues</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">
              {Math.round(stats.totalWatchTime / 60)}m
            </p>
            <p className="text-[10px] text-muted-foreground">Temps total</p>
          </div>
        </div>

        {/* Top vidéos */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Top vidéos
          </p>
          {stats.topVideos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune vidéo trouvée.
            </p>
          ) : (
            stats.topVideos.map((video) => (
              <div
                key={video.videoId}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="h-8 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                  <Play className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{video.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Eye className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {formatNumber(video.views)}
                    </span>
                    <Clock className="h-2.5 w-2.5 text-muted-foreground ml-1" />
                    <span className="text-[10px] text-muted-foreground">
                      {Math.round(video.avgWatchTime)}s
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Progress
                    value={video.completionRate * 100}
                    className="h-1 w-12"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {Math.round(video.completionRate * 100)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </WidgetShell>
  );
}

// ───────────────────────────────────────────
// EXPORT PUBLIC
// ───────────────────────────────────────────

export default function VideoAnalytics({ className }: WidgetProps) {
  return (
    <Suspense fallback={<WidgetSkeleton rows={5} />}>
      <VideoAnalyticsContent className={className} />
    </Suspense>
  );
}