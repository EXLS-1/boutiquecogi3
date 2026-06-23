/**
 * =============================================================================
 * CATALOG CONSTANTS - Boutiquecogi3
 * =============================================================================
 * Centralisation de toutes les constantes liées au catalog.
 */

// ─── Pagination ──────────────────────────────────────────────────────────────
export const HOME_PRODUCTS_LIMIT = 8;
export const CATALOG_PAGE_SIZE = 12;
export const MAX_CATALOG_PAGE_SIZE = 100;
export const DEFAULT_SORT_BY = "createdAt" as const;
export const DEFAULT_SORT_ORDER = "desc" as const;

// ─── Monnaie ─────────────────────────────────────────────────────────────────

export const CURRENCY_DISPLAY = {
  USD: { code: "USD", symbol: "$", locale: "en-US" },
  CDF: { code: "CDF", symbol: "FC", locale: "fr-CD" },
} as const;

// ─── Images ─────────────────────────────────────────────────────────────────
export const PRODUCT_PLACEHOLDER = "/placeholder.webp";
export const PRODUCT_IMAGE_SIZES = {
  thumbnail: { width: 300, height: 300 },
  medium: { width: 600, height: 600 },
  large: { width: 1200, height: 1200 },
} as const;

// ─── Cache & Revalidation ──────────────────────────────────────────────────
export const CACHE_TAGS = {
  CATALOG_PRODUCTS: "catalog-products",
  CATALOG_RECENT: "catalog-recent",
  CATALOG_PROMOTIONS: "catalog-promotions",
  CATALOG_NOUVEAUTES: "catalog-nouveautes",
  CATALOG_CATEGORY: "catalog-category",
} as const;

export const CACHE_DURATIONS = {
  HOME_PRODUCTS: 300,      // 5 minutes
  CATALOG_LIST: 60,        // 1 minute
  PRODUCT_DETAIL: 600,     // 10 minutes
  PROMOTIONS: 180,         // 3 minutes
  NOUVEAUTES: 180,         // 3 minutes
} as const;

// ─── Seuils de Stock ───────────────────────────────────────────────────────
export const STOCK_THRESHOLDS = {
  LOW_STOCK: 5,
  CRITICAL_STOCK: 2,
} as const;

// ─── RBAC par défaut pour les produits ─────────────────────────────────────
export const DEFAULT_PRODUCT_RBAC = {
  minRbacLevel: 7,      // GUEST
  requiresAuth: false,
} as const;