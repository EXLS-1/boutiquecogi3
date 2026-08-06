// prisma/seed/utils/image.ts
// ============================================
// IMAGES & URLS SUPABASE STORAGE
// ============================================

const PLACEHOLDER = "/media/placeholder.webp";

/** Normalise un chemin d'image (conserve les URL absolues). */
export function normalizeImage(path?: string | null): string {
  if (!path) return PLACEHOLDER;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/media/")) return path;
  return `/media${path.startsWith("/") ? path : `/${path}`}`;
}

/** Construit une URL Supabase Storage pour un objet du bucket `products`. */
export function productImageUrl(filename: string, bucket = "products"): string {
  const base = process.env.SUPABASE_URL ?? "https://storage.boutiquecogi3.cd";
  return `${base}/${bucket}/${filename}`;
}

/** Génère une liste d'images déterministes pour un produit. */
export function productImages(productIndex: number, count = 2): string[] {
  const urls: string[] = [];
  for (let i = 0; i < count; i++) {
    urls.push(productImageUrl(`prod-${productIndex + 1}-${i + 1}.webp`));
  }
  return urls;
}
