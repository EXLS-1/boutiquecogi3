// lib/product/types.ts
// ============================================================
// Contrats de lecture — détail produit (couche présentation)
// ============================================================
// Types autonomes (non générés par Prisma) afin que les mappers
// restent compilables même lorsque le schéma dérive (colonnes
// Decimal legacy, relations chargées partiellement, etc.).
// Tous les montants sont des ENTIERS en centimes.

import type { ProductStatus } from "@prisma/client";

export interface ProductDetailsType {
  id: string;
  type: string;
  label: string;
  maxVariants: number;
  requiresApproval: boolean;
}

export interface ProductDetailsVariantStock {
  id: string;
  quantity: number;
  reserved: number;
  alertThreshold: number;
  warehouseId: string | null;
  /** Dérivé : quantity - reserved, borné à zéro. Jamais persisté. */
  available: number;
}

export interface ProductDetailsVariant {
  id: string;
  sku: string;
  /** Dictionnaire d'attributs normalisé, ou null si le payload Json n'est pas exploitable. */
  attributes: Record<string, unknown> | null;
  priceOffset: number;
  isActive: boolean;
  stock: ProductDetailsVariantStock[];
}

export interface ProductDetailsPrice {
  id: string;
  currency: string;
  amount: number;
  compareAtPrice: number | null;
  country: string | null;
  region: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
}

export interface ProductDetailsImage {
  id: string;
  url: string;
  alt: string | null;
  position: number;
}

export interface ProductDetailsTag {
  id: string;
  name: string;
  slug: string;
}

export interface ProductDetailsCategory {
  id: string;
  name: string;
  slug: string;
}

export interface ProductDetailsCatalog {
  /** Surcharge catalogue en centimes (null = pas de surcharge). */
  priceOverride: number | null;
  isActive: boolean;
  catalog: { id: string; name: string };
}

export interface ProductDetailsReview {
  id: string;
  rating: number;
  comment: string | null;
  isVerifiedPurchase: boolean;
  createdAt: Date;
  user: { id: string; name: string | null } | null;
}

export interface ProductDetailsStatusChange {
  id: string;
  oldStatus: ProductStatus;
  newStatus: ProductStatus;
  reason: string | null;
  changedAt: Date;
  changedBy: { id: string; name: string | null } | null;
}

export interface ProductDetailsStock {
  quantity: number;
  reserved: number;
  available: number;
}

export interface ProductDetails {
  id: string;
  name: string;
  sku: string;
  slug: string;
  description: string | null;
  /** Prix de base en centimes (converti depuis le Decimal legacy ou la grille tarifaire). */
  basePrice: number;
  /** Prix courant legacy en centimes — null conservé tel quel, zéro conservé tel quel. */
  price: number | null;
  currency: string;
  status: ProductStatus;
  isFeatured: boolean;
  isArchived: boolean;
  isActive: boolean;
  productType: ProductDetailsType | null;
  variants: ProductDetailsVariant[];
  prices: ProductDetailsPrice[];
  images: ProductDetailsImage[];
  tags: ProductDetailsTag[];
  categories: ProductDetailsCategory[];
  catalogs: ProductDetailsCatalog[];
  attributes: unknown[];
  options: unknown[];
  reviews: ProductDetailsReview[];
  statusHistory: ProductDetailsStatusChange[];
  stock: ProductDetailsStock | null;
  /** Projection de disponibilité prioritaire, sinon stock réel (available > 0). */
  availability: boolean;
  /** Date effective de publication (null = jamais publié). */
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
