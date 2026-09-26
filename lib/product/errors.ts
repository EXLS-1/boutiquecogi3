// lib/products/errors.ts
// =============================================================================
// ERRORS PRODUIT — Classes d'erreurs typées du domaine
// =============================================================================

export class ProductError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ProductError";
  }
}

export class ProductNotFoundError extends ProductError {
  constructor(productId: string) {
    super(`Produit introuvable: ${productId}`, "PRODUCT_NOT_FOUND", 404);
  }
}

export class ProductTypeConfigNotFoundError extends ProductError {
  constructor(productTypeId: string) {
    super(`Configuration du type de produit introuvable: ${productTypeId}`, "PRODUCT_TYPE_CONFIG_NOT_FOUND", 404);
  }
}

export class ProductTypeInactiveError extends ProductError {
  constructor(productTypeId: string) {
    super(`Le type de produit est inactif: ${productTypeId}`, "PRODUCT_TYPE_INACTIVE", 400);
  }
}

export class ProductNameAvailabilityError extends ProductError {
  constructor(field: "name" | "slug" | "sku", value: string) {
    super(`Ce ${field} est déjà utilisé: ${value}`, "PRODUCT_NAME_CONFLICT", 409);
  }
}

export class ProductVariantLimitError extends ProductError {
  constructor(maxVariants: number, currentCount: number) {
    super(
      `Limite de variantes dépassée: maximum ${maxVariants}, actuel ${currentCount}`,
      "PRODUCT_VARIANT_LIMIT_EXCEEDED",
      400
    );
  }
}

export class ProductPriceMissingError extends ProductError {
  constructor(productId: string) {
    super(`Produit sans prix défini: ${productId}`, "PRODUCT_PRICE_MISSING", 400);
  }
}

export class ProductQuotaExceededError extends ProductError {
  constructor(userId: string, limit: number) {
    super(
      `Quota de produits dépassé pour l'utilisateur ${userId}: limite ${limit}`,
      "PRODUCT_QUOTA_EXCEEDED",
      400
    );
  }
}