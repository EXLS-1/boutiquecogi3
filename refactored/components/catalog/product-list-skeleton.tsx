/**
 * =============================================================================
 * PRODUCT LIST SKELETON
 * =============================================================================
 * Composant de loading sophistiqué avec animation pulse et structure réaliste.
 * Utilisé comme fallback Suspense pour les listes de produits.
 */

"use client";

import { memo } from "react";

interface ProductListSkeletonProps {
  readonly count: number;
}

const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="border border-slate-200 rounded-xl p-4 shadow-sm animate-pulse">
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
        {Array.from({ length: 5 }).map((_, j) => (
          <div key={j} className="h-4 w-4 rounded-full bg-slate-200" />
        ))}
        <div className="h-4 rounded bg-slate-200 w-8 ml-1" />
      </div>

      {/* Button skeleton */}
      <div className="h-10 rounded-lg bg-slate-200 w-full" />
    </div>
  );
});

/**
 * Skeleton grid avec nombre configurable de cartes.
 * @param count — Nombre de cartes skeleton à afficher
 */
export function ProductListSkeleton({ count }: ProductListSkeletonProps) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      aria-label="Chargement des produits"
      role="status"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
      <span className="sr-only">Chargement des produits en cours...</span>
    </div>
  );
}
