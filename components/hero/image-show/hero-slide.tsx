// components/hero/image-show/hero-slide.tsx

"use client";

import type { HeroImage, HeroSlide as SlideType } from "./hero-types";
import { HeroImageGrid } from "./hero-image-grid";

// Configuration des médias
const MEDIA_BASE = "/media";

function mediaSrc(file: string): string {
  return `${MEDIA_BASE}/${file}`;
}

// Définition des images du hero
const IMAGES: HeroImage[] = [
  { id: "pict01", type: "image", src: mediaSrc("pict01.webp") },
  { id: "pict02", type: "image", src: mediaSrc("pict02.webp") },
  { id: "pict03", type: "image", src: mediaSrc("pict03.webp") },
  { id: "pict04", type: "image", src: mediaSrc("pict04.webp") },
  { id: "pict05", type: "image", src: mediaSrc("pict05.webp") },
  { id: "pict06", type: "image", src: mediaSrc("pict06.webp") },
  { id: "pict07", type: "image", src: mediaSrc("pict07.webp") },
  { id: "pict12", type: "image", src: mediaSrc("pict12.webp") },
  { id: "pict13", type: "image", src: mediaSrc("pict13.webp") },
];

// Regroupement des images par lots de 3
const CHUNK_SIZE = 3;
const chunkedImages: HeroImage[][] = [];

for (let i = 0; i < IMAGES.length; i += CHUNK_SIZE) {
  const chunk = IMAGES.slice(i, i + CHUNK_SIZE);
  if (chunk.length > 0) {
    chunkedImages.push(chunk);
  }
}

// Export des slides
export const HERO_SLIDES: SlideType[] = chunkedImages.map((group) => ({
  type: "images",
  items: group,
}));

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

// Export des utilitaires pour une utilisation externe si nécessaire
export { mediaSrc, IMAGES, chunkedImages as CHUNKED_IMAGES };
