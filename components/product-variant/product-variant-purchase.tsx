// components/product-variant/product-variant-purchase.tsx
"use client";

import toast from "react-hot-toast";
import useCart from "@/store/use-cart";
import type { CatalogProduct } from "@/lib/product-catalog/catalog-types";
import type { ProductDetailData } from "@/lib/product-catalog/product-detail";
import {
  ProductVariantSelector,
  type ProductVariant,
  type ProductVariantConfig,
} from "@/components/product/product-variant";

interface ProductVariantPurchaseProps {
  readonly config: ProductVariantConfig;
  readonly product: ProductDetailData;
}

export function ProductVariantPurchase({ config, product }: ProductVariantPurchaseProps) {
  const addItem = useCart((state) => state.addItem);

  function handleAddToCart(variant: ProductVariant, quantity: number) {
    const unitPrice = config.basePrice + variant.priceAdjustment;
    const cartProduct: CatalogProduct & { stock?: number } = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: unitPrice,
      currency: product.currency,
      basePrice: config.basePrice,
      image: product.productImages[0]?.url ?? product.images[0] ?? "/placeholder.webp",
      basePriceUSD: unitPrice,
      basePriceCDF: unitPrice,
      isAvailable: variant.stockQuantity > 0 || config.allowBackorder,
      ...(variant.stockQuantity > 0 ? { stock: variant.stockQuantity } : {}),
      availabilityStatus: variant.stockQuantity > 0 ? "in_stock" : "out_of_stock",
      categoryName: product.category?.name ?? null,
      categorySlug: product.category?.slug ?? null,
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      accessPolicy: { visibility: "public", minRbacLevel: 7, requiresAuth: false },
      isPromoted: product.isFeatured,
      isNewArrival: false,
      discountPercent: 0,
    };
    addItem(cartProduct, quantity, variant.id);
    toast.success(`${product.name} — ${variant.sku} ajouté au panier`);
  }

  return <ProductVariantSelector config={config} onAddToCart={handleAddToCart} />;
}

