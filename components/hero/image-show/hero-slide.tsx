// components/hero/hero-slide.tsx

"use client";

import { HeroSlide as SlideType } from "./hero-types";
import { HeroImageGrid } from "./hero-image-grid";
import { HeroVideoSlide } from "./hero-video-slide";

interface Props {
  slide: SlideType; // Retirez Extract et la clé
  priority?: boolean;
}

export function HeroSlide({ slide, priority }: Props) {
  // Gestion des différents types de slides
  if (slide.type === "video") {
    return <HeroVideoSlide item={slide.item} />;
  }
  
  // Pour les slides d'images
  return <HeroImageGrid items={slide.items} priority={priority} />;
}