"use client";

import { useRef } from "react";

import Autoplay from "embla-carousel-autoplay";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import { HERO_SLIDES } from "./hero-media";
import { HeroSlide } from "./hero-slide";

export function Hero() {
  const autoplay = useRef(
    Autoplay({
      delay: 5000,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    })
  );

  return (
    <section className="relative w-full overflow-hidden bg-black">
      <Carousel
        plugins={[autoplay.current]}
        opts={{
          loop: true,
          align: "start",
        }}
        className="w-full"
      >
        <CarouselContent>
          {HERO_SLIDES.map((slide, index) => (
            <CarouselItem
              key={index}
              className="relative h-[80vh] min-h-175 w-full"
            >
              <HeroSlide
                slide={slide}
                priority={index === 0}
              />
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Overlay Content */}
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center px-4 text-center text-white">
          <h1 className="font-playfair text-5xl font-bold uppercase tracking-[0.25em] text-sky-400 drop-shadow-lg md:text-7xl">
            Boutique COGI
          </h1>

          <p className="mt-6 font-lato text-lg tracking-[0.3em] md:text-2xl">
            L&apos;ÉLÉGANCE REDÉFINIE PAR LE STYLE
          </p>
        </div>

        <CarouselPrevious className="absolute left-4 z-30 hidden border-sky-400 text-sky-400 hover:bg-sky-500 hover:text-white md:flex" />

        <CarouselNext className="absolute right-4 z-30 hidden border-sky-400 text-sky-400 hover:bg-sky-500 hover:text-white md:flex" />
      </Carousel>
    </section>
  );
}