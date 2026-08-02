// components/hero/hero.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import type { HeroImage } from "@/components/hero/image-show/hero-types";
import { HeroImageGrid } from "@/components/hero/image-show/hero-image-grid";
import { useHeroImages } from "@/components/hero/image-show/hero-config";

/**
 * Sélectionne aléatoirement 3 images différentes à partir d'un tableau d'images.
 * Si le tableau contient moins de 3 images, toutes sont retournées.
 */
function pickRandomImages(images: HeroImage[]): HeroImage[] {
  if (images.length === 0) return [];
  if (images.length <= 3) return [...images];

  // Copie du tableau pour éviter la mutation
  const shuffled = [...images];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 3);
}

export function Hero() {
  const { images, loading, error } = useHeroImages();
  const [rotationTick, setRotationTick] = useState(0);

  // Les images affichées sont recalculées via useMemo à chaque tick de rotation
  // Cela évite d'appeler setState dans un useEffect (conformité ESLint)
  const currentImages = useMemo<HeroImage[]>(() => {
    if (images.length === 0) return [];
    return pickRandomImages(images);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, rotationTick]);

  // Rotation automatique toutes les 5 secondes
  useEffect(() => {
    // Pas besoin de rotation si ≤ 3 images
    if (images.length <= 3) return;

    const intervalId = setInterval(() => {
      setRotationTick((prev) => prev + 1);
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [images]);

  // Afficher un état de chargement
  if (loading) {
    return (
      <section className="relative w-full overflow-hidden bg-black">
        <div className="flex h-[80vh] min-h-175 items-center justify-center">
          <div className="text-white">Chargement des images...</div>
        </div>
      </section>
    );
  }

  // Afficher un état d'erreur ou aucun contenu
  if (error || currentImages.length === 0) {
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
      <div className="w-full">
        <div className="relative h-[80vh] min-h-175 w-full">
          <HeroImageGrid items={currentImages} priority />
        </div>
      </div>

      {/* Overlay Content */}
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center px-4 text-center text-white">
        <h1 className="font-playfair text-5xl font-bold uppercase tracking-[0.25em] text-sky-400 drop-shadow-lg md:text-7xl">
          Boutique COGI
        </h1>

        <p className="mt-6 font-lato text-lg tracking-[0.3em] md:text-2xl">
          L&apos;ÉLÉGANCE REDÉFINIE PAR LE STYLE
        </p>
      </div>
    </section>
  );
}
