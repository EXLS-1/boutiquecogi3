
import { generateUUIDv7 } from "@/lib/utils/uuid";

export function slugify(text: string): string {
  const normalized = text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  // Cas limite : si le texte ne contient que des caractères spéciaux,
  // symboles ou emojis, le slug serait vide et violerait la contrainte @unique.
  // On fallback sur un identifiant unique pour préserver l'intégrité de la base.
  if (!normalized || normalized.trim() === "") {
    return `item-${generateUUIDv7().slice(0, 8)}`;
  }

  return normalized;
}

export function normalizeImage(path: string): string {
  if (!path) return "/media/placeholder.webp";

  // Les URL externes absolues (http/https) doivent être conservées telles quelles.
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/media/")) return path;
  return `/media${path.startsWith("/") ? path : `/${path}`}`;
}
