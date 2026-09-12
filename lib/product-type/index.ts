// lib/product-type/index.ts
// =============================================================================
// Barrel exports — ProductTypeConfig domain
// =============================================================================

export {
  getProductTypeConfig,
  listProductTypeConfigs,
  DEFAULT_PRODUCT_TYPE_CONFIG,
} from "./product-type.repository";
export {
  canCreateProductType,
  canEditProductType,
  canDeleteProductType,
  checkVariantLimit,
  type ProductTypeActor,
  type ProductTypeDecision,
} from "./product-type.policy";
