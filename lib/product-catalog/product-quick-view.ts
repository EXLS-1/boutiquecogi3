import type { ProductDetailData } from "./product-detail";

/** JSON public minimal : aucune donnée interne de stock, coupon ou utilisateur. */
export type ProductQuickViewData = Pick<ProductDetailData,
  "id" | "slug" | "name" | "description" | "basePrice" | "salePrice" |
  "currency" | "images" | "productImages" | "availabilityStatus" | "availableStock"
>;

export function getProductHref(product: { readonly id: string; readonly slug?: string | null }) {
  return `/products/${encodeURIComponent(product.slug?.trim() || product.id)}`;
}

export function toProductQuickView(product: ProductDetailData): ProductQuickViewData {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    basePrice: product.basePrice,
    salePrice: product.salePrice,
    currency: product.currency,
    images: product.images,
    productImages: product.productImages,
    availabilityStatus: product.availabilityStatus,
    availableStock: product.availableStock,
  };
}
