// prisma/seed/seed-helpers.ts

import { generateUUIDv7 } from "../../lib/uuid";

/**
 * Génère un slug URL-friendly à partir d'une chaîne.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export function normalizeImage(path: string): string {
  if (!path) return "/media/placeholder.webp";
  if (path.startsWith("/media/")) return path;
  return `/media${path.startsWith("/") ? path : `/${path}`}`;
}
