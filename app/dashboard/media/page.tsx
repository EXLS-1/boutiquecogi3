// app/dashboard/media/page.tsx
// Médiathèque avec RBAC
// Level 5+ (Seller+) : upload images | Level 4+ (Moderator+) : vidéos et gros fichiers

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/rbac/server";
import { prisma } from "@/lib/prisma";

import { MediaGrid } from "@/components/dashboard/media/media-grid";
import { MediaUploader } from "@/components/dashboard/media/media-uploader";
import { MediaFilters } from "@/components/dashboard/media/media-filters";
import { Skeleton } from "@/components/ui/skeleton";

interface MediaPageProps {
  searchParams: Promise<{ type?: string; bucket?: string; page?: string }>;
}

export default async function MediaPage({ searchParams }: MediaPageProps) {
  const session = await getServerRBACSession();
  if (!session) redirect("/auth/signin");

  const { level, effectivePermissions } = session;
  const params = await searchParams;

  if (level > 5) redirect("/unauthorized");

  const canUpload = effectivePermissions.has("media:upload");
  const canDelete = effectivePermissions.has("media:delete");
  const canOrganize = effectivePermissions.has("media:organize");

  const page = parseInt(params.page || "1");
  const limit = 24;

  const where = {
    ...(params.type && { type: params.type }),
    ...(params.bucket && { bucket: params.bucket }),
  };

  const [media, total, buckets] = await Promise.all([
    prisma.media.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.media.count({ where }),
    prisma.media.groupBy({ by: ["bucket"], _count: { id: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Médiathèque</h1>
          <p className="text-muted-foreground mt-1">
            {total} fichier{total > 1 ? "s" : ""} · {buckets.length} bucket{buckets.length > 1 ? "s" : ""}
          </p>
        </div>
        {canUpload && <MediaUploader level={level} />}
      </div>

      <Suspense fallback={<Skeleton className="h-12" />}>
        <MediaFilters buckets={buckets} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <MediaGrid
          media={media}
          total={total}
          page={page}
          limit={limit}
          canDelete={canDelete}
          canOrganize={canOrganize}
        />
      </Suspense>
    </div>
  );
}
