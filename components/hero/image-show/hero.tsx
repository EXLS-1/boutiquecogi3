// components/hero/hero.tsx

"use client";

import { useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import { HeroSlide, useHeroSlides } from "@/components/hero/image-show/hero-slide";

export function Hero() {
  const [autoplay] = useState(() =>
    Autoplay({
      delay: 10000,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    })
  );

  const { slides, loading, error } = useHeroSlides();

  // Afficher un état de chargement ou des slides par défaut
  if (loading) {
    return (
      <section className="relative w-full overflow-hidden bg-black">
        <div className="flex h-[80vh] min-h-175 items-center justify-center">
          <div className="text-white">Chargement des images...</div>
        </div>
      </section>
    );
  }

  if (error || slides.length === 0) {
    return (
      <section className="relative w-full overflow-hidden bg-black">
        <div className="flex h-[80vh] min-h-175 items-center justify-center">
          <div className="text-white">Aucune image disponible</div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden bg-black">
      <Carousel
        plugins={[autoplay]}
        opts={{
          loop: true,
          align: "center",
          speed: 8,
          dragFree: false,
          containScroll: "trimSnaps",
          skipSnaps: true,
        }}
        className="w-full"
      >
        <CarouselContent className="transition-transform duration-700 ease-in-out">
          {slides.map((slide, index) => (
            <CarouselItem
              key={index}
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
