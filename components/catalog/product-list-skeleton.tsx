/**
 * =============================================================================
 * PRODUCT LIST SKELETON - Boutiquecogi3
 * =============================================================================
 */

import { Skeleton } from "@/components/ui/skeleton";

interface ProductListSkeletonProps {
  readonly count?: number;
}

export function ProductListSkeleton({ count = 8 }: ProductListSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" aria-label="Chargement">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-slate-200 rounded-2xl p-4 shadow-sm">
          <Skeleton className="w-full aspect-square rounded-xl mb-4" />
          <Skeleton className="h-4 rounded w-1/3 mb-2" />
          <Skeleton className="h-5 rounded w-3/4 mb-3" />
          <Skeleton className="h-4 rounded w-1/4 mb-4" />
          <Skeleton className="h-10 rounded-lg w-full" />
        </div>
      ))}
    </div>
  );
}