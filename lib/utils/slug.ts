// lib/utils/slug.ts

export interface SlugifyOptions {
  maxLength?: number;
  fallback?: string;
}

/**
 * Génère un slug nettoyé, sécurisé pour les URL, avec gestion stricte de la longueur et des fallbacks.
 */
export function slugify(value: string, options: SlugifyOptions = {}): string {
  const { maxLength = 100, fallback = "item" } = options;

  if (!value || typeof value !== "string") {
    return fallback;
  }

  const cleaned = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Suppression des accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")     // Remplacement des caractères non-alphanumériques par -
    .replace(/^-+|-+$/g, "");        // Nettoyage des tirets de début/fin

  if (!cleaned) {
    return fallback;
  }

  // Tronquage propre : on tronque PUIS on retire les tirets résiduels à la fin
  const truncated = cleaned.slice(0, maxLength).replace(/-+$/, "");

  return truncated || fallback;
}

export const generateSlug = slugify;
