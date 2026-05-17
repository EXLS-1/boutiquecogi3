"use client";

import { HeroSlide as SlideType } from "./hero-types";
import { HeroImageGrid } from "./hero-image-grid";
import { HeroVideoSlide } from "./hero-video-slide";

interface Props {
  slide: SlideType;
  priority?: boolean;
}

export function HeroSlide({
  slide,
  priority,
}: Props) {
  if (slide.type === "images") {
    return (
      <HeroImageGrid
        items={slide.items}
        priority={priority}
      />
    );
  }

  return <HeroVideoSlide item={slide.item} />;
}