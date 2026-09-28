// lib/product/product-errors.ts

export class ProductError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 400,
    public details?: Record<string, unknown> | unknown,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "ProductError";
  }
}

export class ProductServiceError extends ProductError {
  constructor(message: string, code: string, statusCode = 400, details?: unknown) {
    super(message, code, statusCode, details);
    this.name = "ProductServiceError";
  }
}

export class ProductNotFoundError extends ProductError {
  constructor(productId: string) {
    super(`Produit introuvable : ${productId}`, "PRODUCT_NOT_FOUND", 404);
  }
}

export class ProductVariantNotFoundError extends ProductError {
  constructor(variantId: string) {
    super(`Variante introuvable : ${variantId}`, "VARIANT_NOT_FOUND", 404);
  }
}

export class ProductConflictError extends ProductError {
  constructor(field: "slug" | "sku", value: string) {
    super(`Conflit d'unicité sur le champ '${field}' : ${value}`, `${field.toUpperCase()}_CONFLICT`, 409);
  }
}

export class InsufficientStockError extends ProductError {
  constructor(variantId: string, requested: number, available: number) {
    super(
      `Stock insuffisant pour la variante ${variantId} (demandé: ${requested}, disponible: ${available})`,
      "INSUFFICIENT_STOCK",
      409
    );
  }
}