// hooks/rbac/index.ts
// ============================================================
// INDEX - Export centralisé
// ============================================================

export { useRBAC } from "./use-rbac";
export { useOrderStatusRBAC } from "./use-order-status-rbac";
export { useProductTypeRBAC } from "./use-product-type-rbac";
export { useMediaTypeRBAC } from "./use-media-type-rbac";
export { useVideoTypeRBAC } from "./use-video-type-rbac";
export { useCategoryRBAC } from "./use-category-rbac";
export { usePaymentMethodRBAC } from "./use-payment-method-rbac";
export { useWishlistRBAC } from "./use-wishlist-rbac";
export { useAuditRBAC } from "./use-audit-rbac";

// Réexport des types depuis leurs sources respectives
export type { OrderStatus } from "./use-order-status-rbac";
export type { ProductType, ProductAction } from "./use-product-type-rbac";
export type { MediaType, MediaAction } from "./use-media-type-rbac";
export type { VideoType, VideoAction } from "./use-video-type-rbac";
export type { CategoryAction } from "./use-category-rbac";
export type { PaymentMethod, PaymentAction } from "./use-payment-method-rbac";
export type { WishlistFeature } from "./use-wishlist-rbac";
export type { AuditEvent, AuditAction } from "./use-audit-rbac";
