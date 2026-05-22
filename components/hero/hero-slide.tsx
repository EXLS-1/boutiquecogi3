// components/hero/hero-slide.tsx
"use client";

import { HeroSlide as SlideType } from "./hero-types";
import { HeroImageGrid } from "./hero-image-grid";

interface Props {
  slide: Extract<SlideType, { type: "images" }>;
  priority?: boolean;
}

export function HeroSlide({
  slide,
  priority,
}: Props) {
  return (
    <HeroImageGrid
      items={slide.items}
      priority={priority}
    />
  );
}