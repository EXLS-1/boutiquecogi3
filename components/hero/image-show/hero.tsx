// components/hero/hero.tsx

"use client";

import { Key, useRef } from "react";

import Autoplay from "embla-carousel-autoplay";


import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import { HeroSlide } from "@/components/hero/image-show/hero-slide";
import { HERO_SLIDES } from "./hero-slides";






export function Hero() {
  const autoplay = useRef(
    Autoplay({
      delay: 10000,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    })
  );

  return (
    <section className="relative w-full overflow-hidden bg-black">
      <Carousel
        // eslint-disable-next-line react-hooks/refs
        plugins={[autoplay.current]}
        opts={{
          loop: true,
          align: "center", // Changé de "start" à "center"
          speed: 8, // Augmenté pour une transition plus douce
          dragFree: false, // Changé de true à false pour un défilement par slide
          containScroll: "trimSnaps", // Ajouté pour un meilleur contrôle
          skipSnaps: true, // Ajouté pour sauter les snaps intermédiaires
        }}
        className="w-full"
      >
        <CarouselContent className="transition-transform duration-700 ease-in-out">
          {HERO_SLIDES.map((slide, index) => (
            <CarouselItem
              key={String(index)}
              className="relative h-[80vh] min-h-175 w-full basis-full"
            >
              <HeroSlide slide={slide} priority={index === 0} />
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

        <CarouselPrevious className="absolute left-4 z-30 flex border-sky-400 text-sky-400 hover:bg-sky-500 hover:text-white" />

        <CarouselNext className="absolute right-4 z-30 flex border-sky-400 text-sky-400 hover:bg-sky-500 hover:text-white" />
      </Carousel>
    </section>
  );
}
