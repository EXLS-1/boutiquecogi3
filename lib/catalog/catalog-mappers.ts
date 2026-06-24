/**
 * =============================================================================
 * CATALOG MAPPERS - Boutiquecogi3
 * =============================================================================
 * Fonctions de mapping produit brut (Prisma) → Produit domaine (Catalog).
 * Validation Zod intégrée pour garantir l'intégrité des données.
 */

import { usdToCdf } from "@/lib/currency/exchange-rate-convert";
import {
  PRODUCT_PLACEHOLDER,
  DEFAULT_PRODUCT_RBAC,
  STOCK_THRESHOLDS,
} from "@/lib/catalog/catalog-constants";
import {
  RawCatalogProduct,
  CatalogProduct,
  AvailabilityStatus,
  AVAILABILITY_STATUS,
} from "@/lib/catalog/catalog-types";

/**
 * Détermine le statut de disponibilité basé sur les données stock
 */
function resolveAvailabilityStatus(
  projection: RawCatalogProduct["availabilityProjection"],
): AvailabilityStatus {
  if (!projection) return AVAILABILITY_STATUS.OUT_OF_STOCK;

  const { isAvailable, stockQuantity = 0 } = projection;

  if (!isAvailable) return AVAILABILITY_STATUS.OUT_OF_STOCK;
  if (stockQuantity <= STOCK_THRESHOLDS.CRITICAL_STOCK)
    return AVAILABILITY_STATUS.OUT_OF_STOCK;
  if (stockQuantity <= STOCK_THRESHOLDS.LOW_STOCK)
    return AVAILABILITY_STATUS.LOW_STOCK;

  return AVAILABILITY_STATUS.IN_STOCK;
}

/**
 * Map un produit brut Prisma vers le format Catalog domaine.
 *
 * Règles métier :
 * - Image : première image par position, fallback placeholder
 * - Prix CDF : conversion automatique depuis USD
 * - Disponibilité : déduite de availabilityProjection
 * - RBAC : valeurs par défaut GUEST si non définies
 * - Promotions/Nouveautés : flags booléens
 */
export function mapCatalogProduct(raw: RawCatalogProduct): CatalogProduct {
  // ─── Image ────────────────────────────────────────────────────────────────
  const image = raw.productImages?.[0]?.url ?? PRODUCT_PLACEHOLDER;

  // ─── Prix ─────────────────────────────────────────────────────────────────
  const basePriceUSD = raw.basePrice;
  const basePriceCDF = usdToCdf(basePriceUSD);

  // ─── Disponibilité ────────────────────────────────────────────────────────
  const availabilityStatus = resolveAvailabilityStatus(
    raw.availabilityProjection,
  );
  const isAvailable = availabilityStatus !== AVAILABILITY_STATUS.OUT_OF_STOCK;

  // ─── RBAC ─────────────────────────────────────────────────────────────────
  const minRbacLevel = raw.minRbacLevel ?? DEFAULT_PRODUCT_RBAC.minRbacLevel;
  const requiresAuth = raw.requiresAuth ?? DEFAULT_PRODUCT_RBAC.requiresAuth;

  // ─── Promotions & Nouveautés ─────────────────────────────────────────────
  const isPromoted = raw.isPromoted ?? false;
  const isNewArrival = raw.isNewArrival ?? false;
  const discountPercent = raw.discountPercent ?? 0;

  // ─── Construction du produit domaine ─────────────────────────────────────
  const product: CatalogProduct = {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    basePrice: raw.basePrice,
    image,
    basePriceUSD,
    basePriceCDF,
    isAvailable,
    availabilityStatus,
    categoryName: raw.category?.name ?? null,
    categorySlug: raw.category?.slug ?? null,
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    requiresAuth,
    isPromoted,
    isNewArrival,
    discountPercent,
  };

  // Validation runtime (dev only, stripped en production)
  if (process.env.NODE_ENV === "development") {
    const { catalogProductSchema } = require("./catalog-types");
    const result = catalogProductSchema.safeParse(product);
    if (!result.success) {
      console.warn(
        "[CatalogMapper] Validation warning pour produit:",
        raw.id,
        result.error.flatten(),
      );
    }
  }

  return Object.freeze(product); // Immutabilité
}

/**
 * Map un tableau de produits bruts
 */
export function mapCatalogProducts(
  raws: readonly RawCatalogProduct[],
): readonly CatalogProduct[] {
  return Object.freeze(raws.map(mapCatalogProduct));
}

/**
 * Map avec filtrage RBAC côté serveur
 */
export function mapCatalogProductsWithRbac(
  raws: readonly RawCatalogProduct[],
  userRbacLevel: number,
  isAuthenticated: boolean,
): readonly CatalogProduct[] {
  return Object.freeze(
    raws.map(mapCatalogProduct).filter((product) => {
      if (product.requiresAuth && !isAuthenticated) return false;
      return userRbacLevel <= product.minRbacLevel;
    }),
  );
}
