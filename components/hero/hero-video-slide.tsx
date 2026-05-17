"use client";

import { HeroVideo } from "./hero-types";

interface Props {
  item: HeroVideo;
}

export function HeroVideoSlide({ item }: Props) {
  return (
    <div className="relative h-full w-full">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source src={item.src} type="video/webm" />
      </video>

      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
}