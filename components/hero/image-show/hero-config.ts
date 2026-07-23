// components/hero/image-show/hero-config.ts

"use client";

import { useState, useEffect } from "react";
import { HeroImage, HeroSlide } from "./hero-types";

// Fonction pour récupérer les images du dossier media
async function fetchImagesFromMedia(): Promise<HeroImage[]> {
  try {
    // Récupérer la liste des fichiers via l'API
    const response = await fetch("/api/media");
    if (!response.ok) {
      throw new Error("Failed to fetch media files");
    }
    const files = await response.json();

    // Filtrer uniquement les images (webp, jpg, png, etc.)
    const imageExtensions = [".webp", ".jpg", ".jpeg", ".png", ".gif", ".svg"];
    const imageFiles = files.filter((file: string) =>
      imageExtensions.some((ext) => file.toLowerCase().endsWith(ext))
    );

    // Créer les objets HeroImage
    return imageFiles.map((file: string) => ({
      id: file.replace(/\.[^/.]+$/, ""), // Nom sans extension
      type: "image" as const,
      src: `/media/${file}`,
    }));
  } catch (error) {
    console.error("Error fetching media files:", error);
    return [];
  }
}

// Hook personnalisé pour gérer les images
export function useHeroImages() {
  const [images, setImages] = useState<HeroImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadImages() {
      try {
        setLoading(true);
        const fetchedImages = await fetchImagesFromMedia();
        if (fetchedImages.length === 0) {
          // Images de fallback si aucune image n'est trouvée
          setImages(getFallbackImages());
        } else {
          setImages(fetchedImages);
        }
        setError(null);
      } catch (err) {
        console.error("Error loading images:", err);
        setError("Failed to load images");
        setImages(getFallbackImages());
      } finally {
        setLoading(false);
      }
    }

    loadImages();
  }, []);

  return { images, loading, error };
}

// Images de fallback au cas où
function getFallbackImages(): HeroImage[] {
  return [
    { id: "fallback1", type: "image", src: "/media/fallback1.webp" },
    { id: "fallback2", type: "image", src: "/media/fallback2.webp" },
    { id: "fallback3", type: "image", src: "/media/fallback3.webp" },
  ];
}

// Fonction pour grouper les images en slides de 3
export function createSlidesFromImages(images: HeroImage[]): HeroSlide[] {
  const CHUNK_SIZE = 3;
  const slides: HeroSlide[] = [];

  for (let i = 0; i < images.length; i += CHUNK_SIZE) {
    const chunk = images.slice(i, i + CHUNK_SIZE);
    if (chunk.length > 0) {
      slides.push({
        type: "images",
        items: chunk,
      });
    }
  }

  return slides;
}
