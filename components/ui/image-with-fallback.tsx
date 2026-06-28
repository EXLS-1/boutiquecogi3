/**
 * =============================================================================
 * IMAGE WITH FALLBACK - Boutiquecogi3
 * =============================================================================
 * Composant Next/Image avec système de fallback multi-niveaux.
 * Gère les erreurs de chargement, placeholder blur et image par défaut.
 */

"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageWithFallbackProps {
  src: string;
  fallbackSrc?: string;
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
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleError = useCallback(() => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
      onError?.();
    }
  }, [hasError, fallbackSrc, onError]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  // Si le fallback lui-même échoue, on affiche un placeholder CSS
  const handleFallbackError = useCallback(() => {
    setImgSrc("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTJlOGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTQ5NDk0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Qm91dGlxdWUgQ09HSTwvdGV4dD48L3N2Zz4=");
  }, []);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-slate-100",
        fill ? "w-full h-full" : "",
        className
      )}
    >
      {!isLoaded && placeholder === "blur" && blurDataURL && (
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
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        className={cn(
          "transition-opacity duration-500",
          isLoaded ? "opacity-100" : "opacity-0",
          "object-cover"
        )}
        onError={hasError ? handleFallbackError : handleError}
        onLoad={handleLoad}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        sizes={sizes}
        quality={quality}
        unoptimized={imgSrc.startsWith("data:")}
      />
    </div>
  );
}















