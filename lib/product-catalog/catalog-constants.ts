/**
 * =============================================================================
 * CATALOG CONSTANTS — Boutiquecogi3
 * =============================================================================
 * SOURCE UNIQUE DE VÉRITÉ pour tout le système catalog.
 * 
 * RÈGLES :
 * - Aucune constante catalog ne doit être définie ailleurs.
 * - Tout import depuis un autre fichier pour ces symboles est une erreur.
 */

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1: PAGINATION
// ═════════════════════════════════════════════════════════════════════════════

export const HOME_PRODUCTS_LIMIT = 8 as const;
export const CATALOG_PAGE_SIZE = 12 as const;
export const MAX_CATALOG_PAGE_SIZE = 100 as const;
export const DEFAULT_SORT_BY = "createdAt" as const;
export const DEFAULT_SORT_ORDER = "desc" as const;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2: MONNAIE
// ═════════════════════════════════════════════════════════════════════════════

export const CURRENCY_DISPLAY = {
  USD: { code: "USD", symbol: "$", locale: "en-US" },
  CDF: { code: "CDF", symbol: "FC", locale: "fr-CD" },
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: IMAGES
// ═════════════════════════════════════════════════════════════════════════════

export const PRODUCT_PLACEHOLDER = "/placeholder.webp" as const;

export const PRODUCT_IMAGE_SIZES = {
  thumbnail: { width: 300, height: 300 },
  medium: { width: 600, height: 600 },
  large: { width: 1200, height: 1200 },
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4: CACHE & REVALIDATION
// ═════════════════════════════════════════════════════════════════════════════
// 
// NOTE: Ces tags sont déclarés ici mais doivent être intégrés dans une
// stratégie de cache invalidation complète (Next.js unstable_cache + revalidateTag).
// Voir: lib/cache/cache-strategy.ts pour l'implémentation.

export const CACHE_TAGS = {
  CATALOG_PRODUCTS: "catalog-products",
  CATALOG_RECENT: "catalog-recent",
  CATALOG_PROMOTIONS: "catalog-promotions",
  CATALOG_NOUVEAUTES: "catalog-nouveautes",
  CATALOG_CATEGORY: "catalog-category",
} as const;

export type CatalogCacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export const CACHE_DURATIONS = {
  HOME_PRODUCTS: 300,      // 5 minutes
  CATALOG_LIST: 60,        // 1 minute
  PRODUCT_DETAIL: 600,     // 10 minutes
  PROMOTIONS: 180,         // 3 minutes
  NOUVEAUTES: 180,         // 3 minutes
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 5: SEUILS DE STOCK (SOURCE UNIQUE)
// ═════════════════════════════════════════════════════════════════════════════
// 
// Problème audit #1: STOCK_THRESHOLDS était fragmenté entre catalog-mappers.ts
// et catalog-types.ts. Désormais, SEULE cette source existe.

export const STOCK_THRESHOLDS = {
  CRITICAL_STOCK: 2,   // Rupture imminente
  LOW_STOCK: 5,        // Stock faible
  MEDIUM_STOCK: 20,    // Stock moyen (pour projections futures)
  HIGH_STOCK: 50,      // Stock confortable
} as const;

export type StockThresholdKey = keyof typeof STOCK_THRESHOLDS;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 6: RBAC PRODUIT PAR DÉFAUT
// ═════════════════════════════════════════════════════════════════════════════

export const DEFAULT_PRODUCT_RBAC = {
  minRbacLevel: 7,      // GUEST (Level 7)
  requiresAuth: false,
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 7: PRODUCT ACCESS POLICY (RBAC AVANCÉ)
// ═════════════════════════════════════════════════════════════════════════════
// 
// Problème audit #5: RBAC partiel. Ce système remplace minRbacLevel seul
// par une politique d'accès complète supportant permissions fines, exclusions,
// ownership et règles métier.

export const PRODUCT_ACCESS_POLICY = {
  // Visibilité par défaut
  DEFAULT_VISIBILITY: "public" as const,

  // Modes de visibilité
  VISIBILITY_MODES: {
    PUBLIC: "public",         // Visible par tous (GUEST+)
    AUTHENTICATED: "authenticated", // USER+ uniquement
    RESTRICTED: "restricted", // Niveau RBAC minimum requis
    PRIVATE: "private",       // Propriétaire + admins
    HIDDEN: "hidden",         // Administrateurs uniquement
  } as const,

  // Permissions spécifiques produit
  PERMISSIONS: {
    VIEW: "product:view",
    VIEW_PRICE: "product:view-price",
    VIEW_STOCK: "product:view-stock",
    PURCHASE: "product:purchase",
    EDIT: "product:edit",
    DELETE: "product:delete",
    MANAGE_INVENTORY: "product:manage-inventory",
  } as const,

  // Règles de restriction
  RESTRICTIONS: {
    REQUIRE_MIN_PURCHASE: "require_min_purchase",
    MAX_PER_ORDER: "max_per_order",
    MEMBERSHIP_ONLY: "membership_only",
    PRE_ORDER_ONLY: "pre_order_only",
  } as const,
} as const;

export type ProductVisibility = 
  (typeof PRODUCT_ACCESS_POLICY.VISIBILITY_MODES)[keyof typeof PRODUCT_ACCESS_POLICY.VISIBILITY_MODES];

export type ProductAccessPermission = 
  (typeof PRODUCT_ACCESS_POLICY.PERMISSIONS)[keyof typeof PRODUCT_ACCESS_POLICY.PERMISSIONS];

export type ProductAccessRestriction = 
  (typeof PRODUCT_ACCESS_POLICY.RESTRICTIONS)[keyof typeof PRODUCT_ACCESS_POLICY.RESTRICTIONS];