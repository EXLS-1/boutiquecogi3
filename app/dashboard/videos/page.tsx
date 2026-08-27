// app/dashboard/videos/page.tsx
// Vidéos avec RBAC
// Level 4+ (Moderator+) : lecture | Level 3+ (Manager+) : upload

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/rbac/server";
import { prisma } from "@/lib/prisma";

import { VideoGrid } from "@/components/dashboard/videos/video-grid";
import { VideoUploader } from "@/components/dashboard/videos/video-uploader";
import { VideoAnalytics } from "@/components/dashboard/videos/video-analytics";
import { Skeleton } from "@/components/ui/skeleton";

interface VideosPageProps {
  searchParams: Promise<{ type?: string; status?: string; page?: string }>;
}

export default async function VideosPage({ searchParams }: VideosPageProps) {
  const session = await getServerRBACSession();
  if (!session) redirect("/auth/sign-in");

  const { level, effectivePermissions } = session;
  const params = await searchParams;

  if (level > 4) redirect("/unauthorized");

  const canUpload = level <= 3 && effectivePermissions.has("media:upload");
  const canDelete = effectivePermissions.has("media:delete");

  const page = parseInt(params.page || "1");
  const limit = 12;

  const where = {
    ...(params.type && { type: params.type }),
    ...(params.status && { status: params.status }),
  };

  const [videos, total, stats] = await Promise.all([
    prisma.video.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.video.count({ where }),
    prisma.video.groupBy({ by: ["type"], _count: { id: true }, _sum: { views: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vidéos</h1>
          <p className="text-muted-foreground mt-1">
            {total} vidéo{total > 1 ? "s" : ""} · Level {level} (max: {level <= 3 ? "4K" : "1080p"})
          </p>
        </div>
        {canUpload && <VideoUploader level={level} />}
      </div>

      <Suspense fallback={<Skeleton className="h-48" />}>
        <VideoAnalytics stats={stats} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <VideoGrid videos={videos} total={total} page={page} limit={limit} canDelete={canDelete} />
      </Suspense>
    </div>
  );
}
