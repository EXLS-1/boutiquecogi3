// lib/products/product.mapper.ts
// =============================================================================
// PRODUCT MAPPER — Conversion Prisma → DTO domaine
// =============================================================================
// Renvoie JAMAIS un Prisma.Product brut dans une page React.
// Tous les Decimal → number, bigint → string, relations aplaties.
//

import type {
  Prisma, Product, ProductVariant, VariantStock, ProductPrice, ProductTypeConfig,
  ProductImage, ProductOption, Category, Catalog, CatalogProduct, Tag,
  ProductAttributeValue, Review, ProductStatusHistory, User, Stock,
} from "@prisma/client";
import { toCents } from "@/lib/product-pricing/pricing.service";
import type { ProductListItem, ProductDetails } from "./types";

type Person = Pick<User, "id" | "name">;
type CategorySummary = Pick<Category, "id" | "name" | "slug">;
type VariantRow = Pick<ProductVariant, "id" | "sku" | "attributes" | "priceOffset" | "isActive"> & {
  variantStocks?: Pick<VariantStock, "id" | "quantity" | "reserved" | "alertThreshold" | "warehouseId">[];
};

/** Champs scalaires requis ; seules les relations effectivement chargées sont fournies. */
export type ProductMapperRow = Pick<Product,
  "id" | "name" | "sku" | "slug" | "description" | "basePrice" | "price" |
  "currency" | "status" | "isFeatured" | "isArchived" | "isActive" | "isdeleted" |
  "categoryId" | "deletedAt" | "scheduledAt" | "publishedAt" | "createdAt" | "updatedAt"
> & {
  productType?: Pick<ProductTypeConfig, "id" | "type" | "label" | "maxVariants" | "requiresApproval"> | null;
  productPrices?: Omit<ProductPrice, "productId">[];
  variants?: VariantRow[];
  productImages?: Pick<ProductImage, "id" | "url" | "alt" | "position">[];
  productOptions?: Pick<ProductOption, "id" | "name" | "value">[];
  stock?: Pick<Stock, "quantity" | "reserved"> | null;
  availabilityProjection?: { isAvailable: boolean } | null;
  category?: CategorySummary | null;
  categoryProducts?: { category: CategorySummary; displayOrder: number }[];
  productTags?: { tag: Pick<Tag, "id" | "name" | "slug"> }[];
  catalogs?: (Pick<CatalogProduct, "priceOverride" | "isActive"> & {
    catalog: Pick<Catalog, "id" | "name">;
  })[];
  productAttributeValues?: (Pick<ProductAttributeValue, "id" | "value"> & { attribute: { name: string } })[];
  productReviews?: (Pick<Review, "id" | "rating" | "comment" | "isVerifiedPurchase" | "createdAt"> & { user?: Person | null })[];
  statusHistory?: (Pick<ProductStatusHistory, "id" | "oldStatus" | "newStatus" | "reason" | "changedAt"> & { changedBy?: Person | null })[];
  _count?: Partial<Pick<Prisma.ProductCountOutputType, "productImages" | "variants" | "catalogs" | "productTags">>;
};

/** Les Decimal legacy sont en unités majeures ; ProductPrice est déjà en centimes. */
function decimalToCents(value: Prisma.Decimal | number | string | null | undefined): number | null {
  // Colonne nullable ou non sélectionnée : absence de prix ≠ prix zéro.
  if (value === null || value === undefined) return null;
  const cents = toCents(value);
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Montant produit hors limites : ${String(value)}`);
  }
  return cents;
}

/**
 * `ProductVariant.attributes` est un `Json` Prisma (`JsonValue`) : rien ne garantit
 * un objet au runtime (scalaire, tableau ou null possible). On normalise donc
 * explicitement vers le dictionnaire plat attendu par le DTO, sans cast brut.
 */
function toAttributeRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  // JsonArray et scalaires ne sont pas des attributs exploitables.
  if (typeof value !== "object" || Array.isArray(value)) return null;

  const attributes: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) attributes[key] = entry;
  }
  return attributes;
}

/** Disponibilité dérivée (jamais persistée) : `quantity - reserved`, jamais négative. */
function availableUnits(stock: { quantity: number; reserved: number } | null | undefined): number {
  const quantity = stock?.quantity ?? 0;
  const reserved = stock?.reserved ?? 0;
  return Math.max(0, quantity - reserved);
}

export function mapProductToListItem(row: ProductMapperRow): ProductListItem {
  const basePriceCents = decimalToCents(row.basePrice) ?? 0;
  // Prix de référence uniquement : ne pas sélectionner un tarif géographique ou planifié arbitraire.
  const referencePrice = row.productPrices?.find((price) =>
    price.currency === row.currency && price.country === null && price.region === null &&
    price.startsAt === null && price.endsAt === null
  );
  const comparePriceCents = referencePrice?.compareAtPrice ?? null;

  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    slug: row.slug,
    productType: row.productType?.type ?? null,
    basePriceCents,
    comparePriceCents,
    currency: row.currency,
    status: row.status,
    isFeatured: row.isFeatured ?? false,
    isArchived: row.isArchived ?? false,
    isActive: row.isActive ?? false,
    imageCount: row._count?.productImages ?? row.productImages?.length ?? 0,
    variantCount: row._count?.variants ?? row.variants?.length ?? 0,
    quantity: row.stock?.quantity ?? 0,
    reserved: row.stock?.reserved ?? 0,
    available: availableUnits(row.stock),
    isAvailableProjection: row.availabilityProjection?.isAvailable ?? false,
    categoryId: row.category?.id ?? row.categoryId ?? null,
    categoryName: row.category?.name ?? null,
    catalogCount: row._count?.catalogs ?? row.catalogs?.length ?? 0,
    tagCount: row._count?.productTags ?? row.productTags?.length ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapProductToDetails(row: ProductMapperRow): ProductDetails {
  const sortedVariants = [...(row.variants ?? [])].sort((a, b) => a.sku.localeCompare(b.sku));
  const sortedImages = [...(row.productImages ?? [])].sort((a, b) => a.position - b.position);
  const sortedCategories = [...(row.categoryProducts ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  const sortedPrices = [...(row.productPrices ?? [])].sort((a, b) => {
    // Universel d'abord, puis spécificité géographique croissante, puis devise.
    const specificity = (price: typeof a) => (price.country ? 2 : 0) + (price.region ? 1 : 0);
    if (specificity(a) !== specificity(b)) return specificity(a) - specificity(b);
    return a.currency.localeCompare(b.currency);
  });
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    slug: row.slug,
    description: row.description,
    basePrice: decimalToCents(row.basePrice) ?? 0,
    price: decimalToCents(row.price),
    currency: row.currency,
    status: row.status,
    isActive: row.isActive,
    isFeatured: row.isFeatured,
    isDeleted: row.isdeleted,
    deletedAt: row.deletedAt,
    scheduledAt: row.scheduledAt,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    productType: row.productType ? {
      id: row.productType.id,
      type: row.productType.type,
      label: row.productType.label,
      maxVariants: row.productType.maxVariants,
      requiresApproval: row.productType.requiresApproval,
    } : null,
    variants: sortedVariants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      attributes: toAttributeRecord(variant.attributes),
      priceOffset: variant.priceOffset,
      isActive: variant.isActive,
      stock: (variant.variantStocks ?? []).map((variantStock) => ({
        id: variantStock.id,
        quantity: variantStock.quantity,
        reserved: variantStock.reserved,
        available: availableUnits(variantStock),
        alertThreshold: variantStock.alertThreshold,
        warehouseId: variantStock.warehouseId,
      })),
    })),
    prices: sortedPrices.map((price) => ({
      id: price.id,
      currency: price.currency,
      amount: price.amount,
      compareAtPrice: price.compareAtPrice,
      country: price.country,
      region: price.region,
      startsAt: price.startsAt,
      endsAt: price.endsAt,
    })),
    images: sortedImages.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt,
      position: image.position,
    })),
    tags: (row.productTags ?? []).map((productTag) => ({
      id: productTag.tag.id,
      name: productTag.tag.name,
      slug: productTag.tag.slug,
    })),
    categories: sortedCategories.map((categoryProduct) => ({
      id: categoryProduct.category.id,
      name: categoryProduct.category.name,
      slug: categoryProduct.category.slug,
      displayOrder: categoryProduct.displayOrder,
    })),
    catalogs: (row.catalogs ?? []).map((catalogProduct) => ({
      id: catalogProduct.catalog.id,
      name: catalogProduct.catalog.name,
      priceOverride: decimalToCents(catalogProduct.priceOverride),
      isActive: catalogProduct.isActive,
    })),
    attributes: (row.productAttributeValues ?? []).map((attributeValue) => ({
      id: attributeValue.id,
      attribute: attributeValue.attribute.name,
      value: attributeValue.value,
    })),
    options: (row.productOptions ?? []).map((option) => ({
      id: option.id,
      name: option.name,
      value: option.value,
    })),
    reviews: (row.productReviews ?? []).map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      isVerifiedPurchase: review.isVerifiedPurchase,
      createdAt: review.createdAt,
      user: review.user ? { id: review.user.id, name: review.user.name } : null,
    })),
    statusHistory: (row.statusHistory ?? []).map((history) => ({
      id: history.id,
      oldStatus: history.oldStatus,
      newStatus: history.newStatus,
      reason: history.reason,
      changedAt: history.changedAt,
      changedBy: history.changedBy ? { id: history.changedBy.id, name: history.changedBy.name } : null,
    })),
    // La projection DB est la source d'autorité ; si elle n'est pas chargée on
    // retombe sur l'inventaire réel plutôt que de déclarer le produit indisponible.
    availability: row.availabilityProjection
      ? row.availabilityProjection.isAvailable
      : availableUnits(row.stock) > 0,
    stock: row.stock ? {
      quantity: row.stock.quantity,
      reserved: row.stock.reserved,
      available: availableUnits(row.stock),
    } : null,
  };
}
