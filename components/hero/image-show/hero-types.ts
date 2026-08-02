// components/hero/hero-types.ts

export type HeroImage = {
  id: string;
  type: "image";
  src: string;
};

export type HeroSlide = {
  type: "images";
  items: HeroImage[];
};