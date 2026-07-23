// components/hero/image-show/hero-slide.tsx

"use client";

import { useEffect, useState } from "react";
import type { HeroImage, HeroSlide as SlideType } from "./hero-types";
import { HeroImageGrid } from "./hero-image-grid";
import { useHeroImages, createSlidesFromImages } from "./hero-config";

// Configuration des médias
const MEDIA_BASE = "/media";

function mediaSrc(file: string): string {
  return `${MEDIA_BASE}/${file}`;
}

// Composant principal
interface HeroSlideProps {
  slide: SlideType;
  priority?: boolean;
}

export function HeroSlide({ slide, priority = false }: HeroSlideProps) {
  if (!slide.items || slide.items.length === 0) {
    console.warn("Slide has no items");
    return null;
  }
  return <HeroImageGrid items={slide.items} priority={priority} />;
}

// Hook pour obtenir les slides dynamiques
export function useHeroSlides() {
  const { images, loading, error } = useHeroImages();
  const [slides, setSlides] = useState<SlideType[]>([]);

  useEffect(() => {
    if (images.length > 0) {
      const newSlides = createSlidesFromImages(images);
      setSlides(newSlides);
    }
  }, [images]);

  return { slides, loading, error };
}

// Export des utilitaires pour une utilisation externe si nécessaire
export { mediaSrc };
