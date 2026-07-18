import type { HeroImage, HeroSlide } from "./hero-types";

const base = "/media";

function mediaSrc(file: string) {
  return `${base}/${file}`;
}

const images: HeroImage[] = [
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

const chunked: HeroImage[][] = [
  images.slice(0, 3),
  images.slice(3, 6),
  images.slice(6, 9),
];

export const HERO_SLIDES: HeroSlide[] = chunked
  .filter((group) => group.length > 0)
  .map((group) => ({ type: "images", items: group }));

