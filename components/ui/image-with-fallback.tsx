/**
 * =============================================================================
 * IMAGE WITH FALLBACK - Boutiquecogi3
 * =============================================================================
 * Composant Next/Image avec système de fallback multi-niveaux.
 * Gère les erreurs de chargement, placeholder blur et image par défaut.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import type { StaticImageData } from "next/image";
import { cn } from "@/lib/utils";

type ImageSource = string | StaticImageData;

interface ImageWithFallbackProps {
  src: ImageSource;
  fallbackSrc?: ImageSource;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  placeholder?: "empty" | "blur";
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
  onError?: () => void;
}

const DEFAULT_FALLBACK = "/images/placeholder-product.jpg";

const INLINE_SVG_FALLBACK =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTJlOGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTQ5NDk0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Qm91dGlxdWUgQ09HSTwvdGV4dD48L3N2Zz4=";

function isDataUrl(value: ImageSource): boolean {
  return typeof value === "string" && value.startsWith("data:");
}

function toPositiveInt(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}

function toSafeQuality(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(100, Math.max(1, Math.floor(value)));
}

export function ImageWithFallback({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  alt,
  width,
  height,
  fill = false,
  className,
  priority = false,
  placeholder = "empty",
  blurDataURL,
  sizes,
  quality,
  onError,
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState<ImageSource>(src);
  const [hasError, setHasError] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Robust logic: keep internal source in sync when parent changes `src`
  // (e.g. variant switch) and reset error/loaded states accordingly.
  useEffect(() => {
    setImgSrc(src);
    setHasError(false);
    setFallbackFailed(false);
    setIsLoaded(false);
  }, [src]);

  const handleError = useCallback(() => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
      onError?.();
    } else if (!fallbackFailed) {
      // Robust logic: fallback image itself failed -> inline SVG placeholder.
      setFallbackFailed(true);
      setImgSrc(INLINE_SVG_FALLBACK);
    }
  }, [hasError, fallbackFailed, fallbackSrc, onError]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  // Robust logic: sanitize numeric props so Next/Image never receives
  // NaN / negative / fractional dimensions or an out-of-range quality.
  const safeWidth = fill ? undefined : toPositiveInt(width);
  const safeHeight = fill ? undefined : toPositiveInt(height);
  const safeQuality = toSafeQuality(quality);
  const safeAlt = alt.trim().length > 0 ? alt : "Image produit";
  const unoptimized = isDataUrl(imgSrc);
  // Robust logic: blur placeholder requires a blurDataURL; otherwise fall
  // back to "empty" to satisfy Next/Image typing and avoid a broken blur.
  const safePlaceholder: "empty" | "blur" =
    placeholder === "blur" && typeof blurDataURL === "string" && blurDataURL.length > 0
      ? "blur"
      : "empty";
  const showBlurOverlay =
    !isLoaded && safePlaceholder === "blur" && typeof blurDataURL === "string";

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-slate-100",
        fill ? "w-full h-full" : "",
        className ?? ""
      )}
    >
      {showBlurOverlay && blurDataURL && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-sm scale-110 transition-opacity duration-500"
          style={{ backgroundImage: `url(${blurDataURL})` }}
          aria-hidden="true"
        />
      )}

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-600" />
        </div>
      )}

      <Image
        src={imgSrc}
        alt={safeAlt}
        width={safeWidth}
        height={safeHeight}
        fill={fill}
        className={cn(
          "transition-opacity duration-500",
          isLoaded ? "opacity-100" : "opacity-0",
          "object-cover"
        )}
        onError={handleError}
        onLoad={handleLoad}
        priority={priority}
        placeholder={safePlaceholder}
        blurDataURL={safePlaceholder === "blur" ? blurDataURL : undefined}
        sizes={sizes}
        quality={safeQuality}
        unoptimized={unoptimized}
      />
    </div>
  );
}















