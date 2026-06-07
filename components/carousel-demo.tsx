"use client";

import {
  Carousel,
  CarouselContent,
  CarouselNavigation,
  CarouselItem,
  CarouselIndicator,
} from "@/components/ui/carousel";
import Image from "next/image";

const SAMPLE_PRODUCTS = [
  { id: 1, src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop", alt: "Montre moderne" },
  { id: 2, src: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop", alt: "Casque audio" },
  { id: 3, src: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=800&auto=format&fit=crop", alt: "Appareil photo" },
  { id: 4, src: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=800&auto=format&fit=crop", alt: "Chaussures sport" },
  { id: 5, src: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800&auto=format&fit=crop", alt: "Sac à main" },
  { id: 6, src: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop", alt: "Sneakers Red" },
];

export function CarouselCustomSizes() {
  return (
    <div className="relative w-full max-w-4xl mx-auto py-10">
      <h2 className="text-2xl font-bold mb-6 px-4">Nos Nouveautés</h2>
      <Carousel className="px-4">
        <CarouselContent>
          {SAMPLE_PRODUCTS.map((product) => (
            <CarouselItem key={product.id} className="basis-1/1 sm:basis-1/2 md:basis-1/3 p-2">
              <div className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100">
                <Image
                  src={product.src}
                  alt={product.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-colors" />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselNavigation alwaysShow />
        <CarouselIndicator className="mt-4" />
      </Carousel>
    </div>
  );
}