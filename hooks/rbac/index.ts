// ============================================================
// INDEX - Export centralisé
// ============================================================
// hooks/rbac/index.ts
export { useRBAC } from "./use-rbac";
export { useOrderStatusRBAC } from "./use-order-status-rbac";
export { useProductTypeRBAC } from "./use-product-type-rbac";
export { useMediaTypeRBAC } from "./use-media-type-rbac";
export { useVideoTypeRBAC } from "./use-video-type-rbac";
export { useCategoryRBAC } from "./use-category-rbac";
export { usePaymentMethodRBAC } from "./use-payment-method-rbac";
export { useWishlistRBAC } from "./use-wishlist-rbac";
export { useAuditRBAC } from "./use-audit-rbac";

// Réexport des types
export type {
  OrderStatus,
  ProductType,
  ProductAction,
  MediaType,
  MediaAction,
  VideoType,
  VideoAction,
  CategoryAction,
  PaymentMethod,
  PaymentAction,
  WishlistFeature,
  AuditEvent,
  AuditAction,
} from "./types";
