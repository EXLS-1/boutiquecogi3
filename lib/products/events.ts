// lib/products/events.ts
// =============================================================================
// EVENTS PRODUIT — Événements métier du domaine Produit
// =============================================================================
// Émis après chaque mutation réussie dans les services.
// Consommé par : cache invalidation, notifications, projections, webhooks.

export type ProductEventType =
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_DELETED"
  | "PRODUCT_RESTORED"
  | "PRODUCT_STATUS_CHANGED"
  | "PRODUCT_PUBLISHED"
  | "PRODUCT_ARCHIVED"
  | "PRODUCT_DISCONTINUED"
  | "PRODUCT_STOCK_ADJUSTED"
  | "PRODUCT_PRICE_CHANGED"
  | "PRODUCT_VARIANT_CREATED"
  | "PRODUCT_VARIANT_UPDATED"
  | "PRODUCT_VARIANT_DELETED"
  | "PRODUCT_MEDIA_ATTACHED"
  | "PRODUCT_MEDIA_DETACHED";

export interface ProductEvent<T = unknown> {
  type: ProductEventType;
  productId: string;
  timestamp: Date;
  payload: T;
}

// ═════════════════════════════════════════════════════════════════════════════
// ÉVÉNEMENTS SPÉCIFIQUES
// ═════════════════════════════════════════════════════════════════════════════

export interface ProductCreatedEvent extends ProductEvent {
  type: "PRODUCT_CREATED";
  payload: {
    productId: string;
    name: string;
    slug: string;
    sku: string;
    productTypeId: string;
    status: "DRAFT";
    variantCount: number;
    totalStock: number;
    createdById: string;
  };
}

export interface ProductUpdatedEvent extends ProductEvent {
  type: "PRODUCT_UPDATED";
  payload: {
    productId: string;
    updatedFields: string[];
    updatedById: string;
  };
}

export interface ProductStatusChangedEvent extends ProductEvent {
  type: "PRODUCT_STATUS_CHANGED";
  payload: {
    productId: string;
    oldStatus: string;
    newStatus: string;
    reason?: string;
    changedById: string;
    publishedAt?: Date;
    publishedById?: string;
  };
}

export interface ProductStockAdjustedEvent extends ProductEvent {
  type: "PRODUCT_STOCK_ADJUSTED";
  payload: {
    productId: string;
    variantId?: string;
    warehouseId?: string;
    delta: number;
    reason: string;
    newQuantity: number;
    adjustedById: string;
  };
}

export interface ProductPriceChangedEvent extends ProductEvent {
  type: "PRODUCT_PRICE_CHANGED";
  payload: {
    productId: string;
    currency: string;
    oldAmount: number;
    newAmount: number;
    source: string;
    changedById: string;
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// ÉMISSION D'ÉVÉNEMENTS
// ═════════════════════════════════════════════════════════════════════════════

export function createProductEvent<T>(
  type: ProductEventType,
  productId: string,
  payload: T
): ProductEvent<T> {
  return {
    type,
    productId,
    timestamp: new Date(),
    payload,
  };
}