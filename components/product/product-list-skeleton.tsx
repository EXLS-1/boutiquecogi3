/**
 * =============================================================================
 * PRODUCT LIST SKELETON
 * =============================================================================
 * Composant de loading sophistiqué avec animation pulse et structure réaliste.
 * Utilisé comme fallback Suspense pour les listes de produits.
 */

interface ProductListSkeletonProps {
  readonly count?: number;
}

const MAX_SKELETON_COUNT = 48;

export function normalizeSkeletonCount(count: number): number {
  if (!Number.isFinite(count)) return 0;
  return Math.min(Math.max(Math.floor(count), 0), MAX_SKELETON_COUNT);
}

function SkeletonCard() {
  return (
    <div
      role="listitem"
      className="border border-slate-200 rounded-xl p-4 shadow-sm animate-pulse"
    >
      {/* Image skeleton avec aspect ratio réaliste */}
      <div className="relative w-full aspect-[4/5] rounded-lg mb-4 bg-slate-200 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-shimmer" />
        <div className="absolute top-2 right-2 w-10 h-6 rounded bg-slate-300/50" />
      </div>

      {/* Badge skeleton */}
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-16 rounded-full bg-slate-200" />
        <div className="h-5 w-12 rounded-full bg-slate-200" />
      </div>

      {/* Title skeleton */}
      <div className="h-6 rounded bg-slate-200 w-3/4 mb-2" />

      {/* Price skeleton */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 rounded bg-slate-200 w-20" />
        <div className="h-4 rounded bg-slate-200 w-14" />
      </div>

      {/* Rating skeleton */}
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-4 w-4 rounded-full bg-slate-200" />
        ))}
        <div className="h-4 rounded bg-slate-200 w-8 ml-1" />
      </div>

      {/* Button skeleton */}
      <div className="h-10 rounded-lg bg-slate-200 w-full" />
    </div>
  );
}

/**
 * Skeleton grid avec nombre configurable de cartes.
 * @param count — Nombre de cartes skeleton à afficher
 */
export function ProductListSkeleton({ count = 8 }: ProductListSkeletonProps) {
  const safeCount = normalizeSkeletonCount(count);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Chargement des produits"
    >
      <span className="sr-only">Chargement des produits en cours...</span>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        role="list"
        aria-label="Produits en cours de chargement"
        aria-hidden="true"
      >
        {Array.from({ length: safeCount }, (_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </div>
  );
}
