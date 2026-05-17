"use client";

import Image from "next/image";
import { HeroImage } from "./hero-types";

interface Props {
  items: HeroImage[];
  priority?: boolean;
}

export function HeroImageGrid({
  items,
  priority = false,
}: Props) {
  return (
    <div className="grid h-full w-full grid-cols-3">
      {items.map((image, index) => (
        <div
          key={image.id}
          className="relative h-full overflow-hidden"
        >
          <Image
            src={image.src}
            alt={image.id}
            fill
            priority={priority && index === 0}
            sizes="33vw"
            className="object-cover"
          />

          <div className="absolute inset-0 bg-black/30" />
        </div>
      ))}
    </div>
  );
}