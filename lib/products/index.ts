// lib/products/index.ts
// =============================================================================
// Barrel exports — Domaine Produit
// =============================================================================
// Point d'entrée unique pour le domaine produit.
// Le code consommateur importe depuis @/lib/products (jamais directement
// depuis les fichiers internes sauf cas particulier).
//

export { ProductService, ProductServiceError } from "./product.service";
export {
  ProductError,
  PRODUCT_ERROR_CODES,
  type ProductErrorCode,
} from "./productService";
export {
  transitionProductStatus,
  isTransitionAllowed,
  canPublishProduct,
  publishScheduledProducts,
  ALLOWED_TRANSITIONS,
  ProductWorkflowError,
  type TransitionOptions,
} from "./product-workflow";
export {
  getProductKpis,
  getProductList,
  getProductDetails,
  getProductAnalytics,
  type ProductQuery,
  type ProductListItem,
  type ProductListResult,
  type ProductKpis,
} from "./product.repository";
export {
  ProductValidationService,
  dynamicProductSchema,
  type DynamicProductInput,
} from "./validationService";
export {
  mapProductToListItem,
  mapProductToDetails,
} from "./product.mapper";
export {
  canCreateProduct,
  canEditProduct,
  canDeleteProduct,
  canPublishProduct,
  canArchiveProduct,
  type ProductActor,
  type ProductDecision,
} from "./product.policy";
export {
  PRODUCT_LIMITS,
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUS_COLORS,
  PUBLISHABLE_STATUSES,
  STOCK_THRESHOLDS,
  PRODUCT_CACHE,
  SERVER_ACTION_RESULT,
} from "./product.constants";
export type {
  DynamicProductInput,
  VariantInputDto,
  CreateProductDto,
  CreatedProductResult,
  StockMovementInput,
  ProductFormInput,
  ProductUpdateInput,
  ProductFilter,
  ProductPagination,
  ProductListItem,
  ProductListResult,
  ProductKpis,
  ProductMutationResult,
  PriceInput,
} from "./types";
