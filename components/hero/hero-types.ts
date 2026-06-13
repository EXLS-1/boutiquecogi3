// components/hero/hero-types.ts

export type HeroImage = {
  id: string;
  type: "image";
  src: string;
};

export type HeroVideo = {
  id: string;
  type: "video";
  src: string;
};

export type HeroMedia = HeroImage | HeroVideo;

export type HeroSlide =
  | {
      type: "images";
      items: HeroImage[];
    }
  | {
      type: "video";
      item: HeroVideo;
    };
