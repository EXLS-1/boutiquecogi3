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

  { id: "vid1", type: "video", src: "/video/vid01.webm" },
  { id: "vid2", type: "video", src: "/video/vid02.webm" },
  { id: "vid3", type: "video", src: "/video/vid03.webm" },
];

const images = MEDIA_ITEMS.filter(
  (item): item is Extract<HeroMedia, { type: "image" }> =>
    item.type === "image"
);

const videos = MEDIA_ITEMS.filter(
  (item): item is Extract<HeroMedia, { type: "video" }> =>
    item.type === "video"
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

function createVideoSlides(): HeroSlide[] {
  return videos.map((video) => ({
    type: "video",
    item: video,
  }));
}

export const HERO_SLIDES: HeroSlide[] = [
  ...createSlidingImageGroups(),
  ...createVideoSlides(),
];