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
      const errorText = await response.text().catch(() => "No response body");
      throw new Error(
        `Failed to fetch media files: ${response.status} ${response.statusText} - ${errorText}`
      );
    }
    const files = await response.json();

    // Vérifier que la réponse est bien un tableau
    if (!Array.isArray(files)) {
      console.warn("API/media returned non-array response:", files);
      return [];
    }

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

/**
 * Images de fallback utilisant les images existantes dans /public/media/
 * Utilisées lorsque l'appel API échoue ou ne retourne aucune image.
 * Les chemins pointent vers des fichiers qui existent réellement dans le projet.
 */
function getFallbackImages(): HeroImage[] {
  return [
    { id: "pict01", type: "image", src: "/media/pict01.webp" },
    { id: "pict02", type: "image", src: "/media/pict02.webp" },
    { id: "pict03", type: "image", src: "/media/pict03.webp" },
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
