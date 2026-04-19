"use client";

import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef, useMemo } from "react";

const MEDIA_ITEMS = [
  { id: "img1", type: "image", src: "/media/pict01.webp" },
  { id: "img2", type: "image", src: "/media/pict02.webp" },
  { id: "img3", type: "image", src: "/media/pict03.webp" },
  { id: "img4", type: "image", src: "/media/pict04.webp" },
  { id: "img5", type: "image", src: "/media/pict05.webp" },
  { id: "img6", type: "image", src: "/media/pict06.webp" },
  { id: "img7", type: "image", src: "/media/pict07.webp" },
  { id: "vid1", type: "video", src: "/video/vid01.mp4" },
  { id: "vid2", type: "video", src: "/video/vid02.mp4" },
  { id: "vid3", type: "video", src: "/video/vid03.mp4" },
];

export const Hero = () => {
  const plugin = useRef(Autoplay({ delay: 5000, stopOnInteraction: true }));

  const renderedMedia = useMemo(() => {
    return MEDIA_ITEMS.map((media, index) => (
      <CarouselItem key={media.id} className="relative w-full h-[80vh] min-h-[600px]">
        {media.type === "image" ? (
          <Image
            src={media.src}
            alt={`Slide ${index + 1}`}
            fill
            priority={index === 0} // LCP optimization: only priority load the first image
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="none" // Performance: Do not preload background videos
          >
            <source src={media.src} type="video/mp4" />
          </video>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-black/40" />
      </CarouselItem>
    ));
  }, []);

  return (
    <section className="relative w-full overflow-hidden bg-[var(--background)]">
      <Carousel
        plugins={[plugin.current]}
        className="w-full"
        opts={{ loop: true }}
      >
        <CarouselContent>
          {renderedMedia}
        </CarouselContent>
        
        {/* Contenu superposé (Statique par-dessus le carrousel) */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white px-4 text-center pointer-events-none">
           <h1 className="text-5xl md:text-7xl font-playfair font-bold tracking-widest uppercase drop-shadow-md text-[var(--turquoise)]">
            Boutique COGI
          </h1>
          <p className="mt-4 text-xl tracking-[0.2em] font-lato">
            L'ÉLÉGANCE REDÉFINIE
          </p>
        </div>

        <CarouselPrevious className="absolute left-4 z-20 text-[var(--turquoise)] border-[var(--turquoise)] hover:bg-[var(--rose)] hover:text-white pointer-events-auto hidden md:flex" />
        <CarouselNext className="absolute right-4 z-20 text-[var(--turquoise)] border-[var(--turquoise)] hover:bg-[var(--rose)] hover:text-white pointer-events-auto hidden md:flex" />
      </Carousel>
    </section>
  );
};
