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
    <div className="flex h-full w-full items-center justify-center overflow-hidden px-6 md:px-10">
      <div className="flex h-full w-full max-w-450 items-center justify-center gap-4 md:gap-6 lg:gap-8">
        {items.map((image, index) => {
          const isCenter = index === 1;

          return (
            <div
              key={image.id}
              className={`
                relative
                overflow-hidden
                rounded-3xl
                border
                border-white/10
                bg-black/20
                shadow-2xl
                backdrop-blur-sm
                transition-all
                duration-2000
                ease-out
                will-change-transform
                ${
                  isCenter
                    ? `
                      z-20
                      h-[72%]
                      w-[38%]
                      scale-100
                    `
                    : `
                      z-10
                      h-[62%]
                      w-[28%]
                      scale-80
                      opacity-90
                    `
                }
              `}
            >
              {/* Image */}
              <Image
                src={image.src}
                alt={image.id}
                fill
                priority={priority && isCenter}
                sizes={
                  isCenter
                    ? "(max-width: 768px) 90vw, 38vw"
                    : "(max-width: 768px) 45vw, 28vw"
                }
                className="
                  object-cover
                  transition-transform
                  duration-3000
                  // ease-out
                  hover:scale-105
                "
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/10 to-transparent"   />

              {/* Glass reflection */}
              <div className="absolute inset-0 bg-white/3" />
            </div>
          );
        })}
      </div>
    </div>
  );
}