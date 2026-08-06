// prisma/seed/utils/slug.ts
// ============================================
// SLUGS DÉTERMINISTES URL-FRIENDLY
// ============================================
// Réutilise le slugify applicatif existant (@/lib/utils/slug) pour rester
// cohérent avec le reste de la codebase, avec sécurité anti-vide.

import { slugify as appSlugify } from "@/lib/utils/slug";

/**
 * Génère un slug déterministe à partir d'un nom et d'un suffixe unique.
 * Si le nom ne produit aucun caractère UTF-8 sûr, on utilise un fallback
 * basé sur l'index pour garantir l'unicité.
 */
export function makeSlug(name: string, index?: number): string {
  const base = appSlugify(name, { fallback: "item" });
  if (index !== undefined) return `${base}-${index}`;
  return base;
}

export { appSlugify as slugify };
