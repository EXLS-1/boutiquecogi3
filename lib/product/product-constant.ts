// lib/product/product-constant.ts

import { ProductStatus } from "@prisma/client";

export const PRODUCT_STATUS = {
  DRAFT: ProductStatus.DRAFT,
  PENDING: ProductStatus.PENDING,
  SCHEDULED: ProductStatus.SCHEDULED,
  PUBLISHED: ProductStatus.PUBLISHED,
  ARCHIVED: ProductStatus.ARCHIVED,
  DISCONTINUED: ProductStatus.DISCONTINUED,
} as const;

export const VARIANT_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type VariantStatus = (typeof VARIANT_STATUS)[keyof typeof VARIANT_STATUS];

export const PRODUCT_LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 200,
  DESC_MAX: 5000,
  SKU_MIN: 3,
  SKU_MAX: 64,
  PRICE_MAX: 1_000_000_000,
  VARIANT_MAX: 100,
  IMAGE_MAX: 10,
  MAX_IMAGES_PER_PRODUCT: 10,
  MAX_IMAGES_PER_VARIANT: 5,
  CATEGORY_MAX: 10,
  TAG_MAX: 50,
} as const;


export const STATUS_TRANSITIONS: Record<ProductStatus, readonly ProductStatus[]> = {
  [ProductStatus.DRAFT]: [ProductStatus.PENDING, ProductStatus.SCHEDULED, ProductStatus.PUBLISHED, ProductStatus.ARCHIVED],
  [ProductStatus.PENDING]: [ProductStatus.DRAFT, ProductStatus.PUBLISHED, ProductStatus.ARCHIVED],
  [ProductStatus.SCHEDULED]: [ProductStatus.DRAFT, ProductStatus.PUBLISHED, ProductStatus.ARCHIVED],
  [ProductStatus.PUBLISHED]: [ProductStatus.DRAFT, ProductStatus.ARCHIVED, ProductStatus.DISCONTINUED],
  [ProductStatus.ARCHIVED]: [ProductStatus.DRAFT, ProductStatus.PUBLISHED],
  [ProductStatus.DISCONTINUED]: [],
} as const;

export const STOCK_THRESHOLDS = {
  LOW_STOCK: 10,
  CRITICAL: 5,
} as const;
