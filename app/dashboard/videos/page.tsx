// app/dashboard/videos/page.tsx
// Vidéos avec RBAC
// Level 4+ (Moderator+) : lecture | Level 3+ (Manager+) : upload

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/rbac/server";

import { VideoGrid } from "@/components/dashboard/videos/video-grid";
import { VideoUploader } from "@/components/dashboard/videos/video-uploader";
import { Skeleton } from "@/components/ui/skeleton";

interface VideosPageProps {
  searchParams: Promise<{ type?: string; status?: string; page?: string }>;
}

export default async function VideosPage({}: VideosPageProps) {
  const session = await getServerRBACSession();
  if (!session) redirect("/auth/sign-in");

  const { level, effectivePermissions } = session;

  if (level > 4) redirect("/unauthorized");

  const canUpload = level <= 3 && effectivePermissions.has("media:upload");
  const canDelete = effectivePermissions.has("media:delete");

  // Aucun modèle Video n'existe dans le schéma Prisma actuel : les vidéos sont
  // gérées via la médiathèque (/dashboard/media). Page conservée en état vide.
  const videos: never[] = [];
  const total = 0;

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

      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        Le module vidéo n&apos;est pas encore disponible. Utilisez la médiathèque pour gérer vos
        fichiers média{canDelete ? "" : ""}.
      </div>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <VideoGrid videos={videos} total={total} page={1} limit={12} canDelete={canDelete} />
      </Suspense>
    </div>
  );
}
