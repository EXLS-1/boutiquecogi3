// lib/product/index.ts

// =============================================================================
// Point d'entrée unique pour le Domaine Produit
// =============================================================================

export { ProductService } from "@/lib/product/product-service";
export { ProductError, ProductNotFoundError, ProductVariantNotFoundError, InsufficientStockError } from "@/lib/product/product-errors";
export { transitionProductStatus } from "@/lib/product/product-workflow";
export { getProductKpis, getProductList } from "@/lib/product/product-repository";
export { mapProductToListItem } from "@/lib/product/product-mapper";
export { canCreateProduct, canEditProduct, canDeleteProduct } from "@/lib/product/product-policy";
export { PRODUCT_LIMITS, PRODUCT_STATUS, STATUS_TRANSITIONS, STOCK_THRESHOLDS } from "@/lib/product/product-constant";
export { emitProductEvent, registerProductEventListener } from "@/lib/product/product-events";

export type {
  CreateProductDto,
  VariantInputDto,
  PriceInput,
  ProductQuery,
  ProductListItem,
  ProductListResult,
  ProductKpis,
  ProductActor,
} from "@/lib/product/product-types";
