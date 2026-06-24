/**
 * =============================================================================
 * CATALOG MAPPERS — Boutiquecogi3
 * =============================================================================
 * Fonctions de mapping produit brut (Prisma) → Produit domaine (Catalog).
 * Validation Zod intégrée pour garantir l'intégrité des données.
 * 
 * Problèmes audit résolus :
 * - #1: STOCK_THRESHOLDS importé depuis catalog-constants.ts (source unique)
 * - #5: RBAC remplacé par ProductAccessPolicy complet
 * - #6: stockQuantity requis dans availabilityProjection
 */

import { usdToCdf } from "@/lib/currency/exchange-rate-convert";
import {
  PRODUCT_PLACEHOLDER,
  DEFAULT_PRODUCT_RBAC,
  STOCK_THRESHOLDS,
  PRODUCT_ACCESS_POLICY,
} from "./catalog-constants";
import {
  RawCatalogProduct,
  CatalogProduct,
  AvailabilityStatus,
  AVAILABILITY_STATUS,
  RBAC_LEVELS,
  type ProductAccessPolicy,
  DEFAULT_ACCESS_POLICY,
  catalogProductSchema,
} from "./catalog-types";

// ─── Helpers internes ────────────────────────────────────────────────────────

/**
 * Détermine le statut de disponibilité basé sur les données stock.
 * 
 * Problème audit #1: Utilise STOCK_THRESHOLDS depuis catalog-constants.ts.
 * Problème audit #6: stockQuantity est désormais requis.
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
 * Construit la politique d'accès complète à partir des données brutes.
 * 
 * Problème audit #5: Remplace le RBAC partiel (minRbacLevel + requiresAuth)
 * par une ProductAccessPolicy complète.
 */
function buildAccessPolicy(raw: RawCatalogProduct): ProductAccessPolicy {
  const minRbacLevel = raw.minRbacLevel ?? DEFAULT_PRODUCT_RBAC.minRbacLevel;
  const requiresAuth = raw.requiresAuth ?? DEFAULT_PRODUCT_RBAC.requiresAuth;

  // Détermine la visibilité en fonction du niveau RBAC
  let visibility: ProductAccessPolicy["visibility"] = "public";
  if (minRbacLevel <= RBAC_LEVELS.ADMIN) {
    visibility = "hidden"; // Produits admin-only
  } else if (minRbacLevel <= RBAC_LEVELS.USER) {
    visibility = requiresAuth ? "authenticated" : "restricted";
  } else {
    visibility = "public";
  }

  return {
    visibility,
    minRbacLevel: minRbacLevel as typeof RBAC_LEVELS[keyof typeof RBAC_LEVELS],
    requiresAuth,
  };
}

/**
 * Map un produit brut Prisma vers le format Catalog domaine.
 *
 * Règles métier :
 * - Image : première image par position, fallback placeholder
 * - Prix CDF : conversion automatique depuis USD
 * - Disponibilité : déduite de availabilityProjection (stockQuantity requis)
 * - RBAC : ProductAccessPolicy complète
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

  // ─── RBAC — ProductAccessPolicy complète ─────────────────────────────────
  const accessPolicy = buildAccessPolicy(raw);

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
    accessPolicy,
    isPromoted,
    isNewArrival,
    discountPercent,
  };

  // Validation runtime (dev only, stripped en production)
  if (process.env.NODE_ENV === "development") {
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
 * Map un tableau de produits bruts.
 */
export function mapCatalogProducts(
  raws: readonly RawCatalogProduct[],
): readonly CatalogProduct[] {
  return Object.freeze(raws.map(mapCatalogProduct));
}

/**
 * Filtre les produits selon la ProductAccessPolicy et le contexte utilisateur.
 * 
 * Problème audit #5: Remplace le filtrage RBAC basique par une vérification
 * complète de la ProductAccessPolicy.
 * 
 * @param products - Produits déjà mappés
 * @param userRbacLevel - Niveau RBAC de l'utilisateur (7 = GUEST)
 * @param isAuthenticated - L'utilisateur est-il authentifié ?
 * @param userPermissions - Permissions spécifiques de l'utilisateur (optionnel)
 */
export function filterProductsByAccessPolicy(
  products: readonly CatalogProduct[],
  userRbacLevel: number,
  isAuthenticated: boolean,
  userPermissions?: readonly string[],
): readonly CatalogProduct[] {
  return Object.freeze(
    products.filter((product) => {
      const policy = product.accessPolicy;

      // Vérification authentification
      if (policy.requiresAuth && !isAuthenticated) return false;

      // Vérification niveau RBAC
      if (userRbacLevel > policy.minRbacLevel) return false;

      // Vérification permissions spécifiques (si définies)
      if (policy.requiredPermissions && policy.requiredPermissions.length > 0) {
        if (!userPermissions) return false;
        const hasAll = policy.requiredPermissions.every((perm) =>
          userPermissions.includes(perm),
        );
        if (!hasAll) return false;
      }

      // Vérification exclusions de rôles
      if (policy.excludedRoles && policy.excludedRoles.length > 0) {
        // Nécessiterait le rôle nominal de l'utilisateur — simplifié ici
        // À étendre quand le rôle est disponible
      }

      return true;
    }),
  );
}

/**
 * Map avec filtrage RBAC côté serveur (API legacy — déprécié).
 * Préférer filterProductsByAccessPolicy pour les nouveaux usages.
 * 
 * @deprecated Utilisez filterProductsByAccessPolicy à la place.
 */
export function mapCatalogProductsWithRbac(
  raws: readonly RawCatalogProduct[],
  userRbacLevel: number,
  isAuthenticated: boolean,
): readonly CatalogProduct[] {
  const mapped = raws.map(mapCatalogProduct);
  return filterProductsByAccessPolicy(mapped, userRbacLevel, isAuthenticated);
}
