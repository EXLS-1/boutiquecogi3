// prisma/seed/shared/images.ts
// ============================================
// ASSETS STATIQUES D'EXEMPLES
// ============================================

/**
 * Images média locales disponibles (dans /public/media).
 * Utilisées comme placeholders pour les produits/dev.
 */
export const SAMPLE_IMAGES = [
  "/media/pict01.webp",
  "/media/pict02.webp",
  "/media/pict03.webp",
  "/media/pict04.webp",
  "/media/pict05.webp",
  "/media/pict06.webp",
  "/media/pict07.webp",
  "/media/pict12.webp",
  "/media/placeholder.webp",
] as const;

/** Image par défaut pour les produits sans visuel. */
export const DEFAULT_PRODUCT_IMAGE = "/media/placeholder.webp";

/** Bannières pour la page d'accueil. */
export const HOME_BANNERS = [
  { src: "/media/banner-1.webp", alt: "Nouvelle collection femme" },
  { src: "/media/banner-2.webp", alt: "Promotions homme" },
  { src: "/media/banner-3.webp", alt: "Accessoires tendance" },
] as const;
