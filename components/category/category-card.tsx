/**
 * =============================================================================
 * CATEGORY CARD - Atome - Boutiquecogi3
 * =============================================================================
 * Composant de carte réutilisable pour les catégories.
 * Optimisé pour Tailwind v4, Next.js Image, shadcn UI.
 * 
 * Responsabilité unique : afficher une carte de catégorie.
 */

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CategoryCardProps } from "@/lib/category/category-types";

/**
 * Props étendues avec support badge shadcn
 */
interface ExtendedCategoryCardProps extends CategoryCardProps {
  readonly className?: string;
  readonly aspectRatio?: "4/3" | "16/9" | "1/1" | "3/4";
}

function CategoryCardComponent({
  title,
  subtitle,
  imageSrc,
  imageAlt,
  href = "#",
  badge,
  badgeVariant = "default",
  priority = false,
  className = "",
  aspectRatio = "4/3",
}: ExtendedCategoryCardProps) {
  // ─── Validation robuste ─────────────────────────────────────────────────
  const hasValidImage = typeof imageSrc === "string" && imageSrc.trim().length > 0;
  const aspectClass = {
    "4/3": "aspect-4/3",
    "16/9": "aspect-video",
    "1/1": "aspect-square",
    "3/4": "aspect-3/4",
  }[aspectRatio];

  return (
    <Link
      href={href}
      className={`
        group relative flex flex-col overflow-hidden rounded-2xl 
        border border-slate-200 bg-white shadow-sm 
        transition-all duration-300 
        hover:shadow-xl hover:border-cyan-400/30 hover:-translate-y-1
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
        ${className}
      `}
      aria-label={`Découvrir la catégorie ${title}`}
    >
      {/* ─── Conteneur Image ───────────────────────────────────────────────── */}
      <div className={`relative ${aspectClass} w-full overflow-hidden bg-slate-100`}>
        {hasValidImage ? (
          <Image
            src={imageSrc}
            alt={imageAlt || title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-400">
            <span className="text-xs font-medium italic">Image non disponible</span>
          </div>
        )}
        
        {/* Overlay gradient au hover */}
        <div 
          className="absolute inset-0 bg-linear-to-t from-slate-900/60 to-transparent 
                     opacity-0 transition-opacity duration-300 group-hover:opacity-100" 
          aria-hidden="true"
        />

        {/* Badge optionnel (Nouveau, Promo, etc.) */}
        {badge && (
          <div className="absolute top-3 left-3 z-10">
            <Badge variant={badgeVariant} className="font-semibold text-xs uppercase tracking-wide">
              {badge}
            </Badge>
          </div>
        )}
      </div>

      {/* ─── Contenu ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-slate-900 mb-1 uppercase tracking-tight truncate">
              {title}
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">
              {subtitle}
            </p>
          </div>
          <ChevronRight 
            className="shrink-0 text-slate-300 group-hover:text-cyan-600 transition-colors duration-300" 
            aria-hidden="true"
          />
        </div>

        {/* CTA révélé au hover */}
        <div className="mt-4 flex items-center text-sm font-semibold text-cyan-700 
                        opacity-0 transition-all duration-300 translate-y-2 
                        group-hover:opacity-100 group-hover:translate-y-0">
          Découvrir la collection
          <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}

// ─── Memoization pour éviter les re-renders inutiles ────────────────────────
export const CategoryCard = memo(CategoryCardComponent);
CategoryCard.displayName = "CategoryCard";