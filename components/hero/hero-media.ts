import { HeroMedia, HeroSlide } from "./hero-types";

const MEDIA_ITEMS: HeroMedia[] = [
  { id: "img1", type: "image", src: "/media/pict01.webp" },
  { id: "img2", type: "image", src: "/media/pict02.webp" },
  { id: "img3", type: "image", src: "/media/pict03.webp" },
  { id: "img4", type: "image", src: "/media/pict04.webp" },
  { id: "img5", type: "image", src: "/media/pict05.webp" },
  { id: "img6", type: "image", src: "/media/pict06.webp" },
  { id: "img7", type: "image", src: "/media/pict07.webp" },
  { id: "img12", type: "image", src: "/media/pict12.webp" },
  { id: "img13", type: "image", src: "/media/pict13.webp" },
];

const images = MEDIA_ITEMS.filter(
  (item): item is Extract<HeroMedia, { type: "image" }> =>
    item.type === "image"
);

function createSlidingImageGroups() {
  const groups: HeroSlide[] = [];

  for (let i = 0; i < images.length; i++) {
    groups.push({
      type: "images",
      items: [
        images[i],
        images[(i + 1) % images.length],
        images[(i + 2) % images.length],
      ],
    });
  }

  return groups;
}

export const HERO_SLIDES: HeroSlide[] = createSlidingImageGroups();