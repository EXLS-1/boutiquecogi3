// components/product-price/purchase-zone.tsx

"use client";

import { useState } from "react";
import type { Currency, ProductStatus } from "@prisma/client";
import { ShoppingBag, CreditCard, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Price from "@/components/product-price/price";
import type { ResolvedPrice } from "@/lib/product/pricing/price.types";
import type { CatalogProduct } from "@/lib/product-catalog/catalog-types";
import useCart from "@/store/use-cart";
import { useCurrencyStore } from "@/store/use-currency-store";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils/utils";

interface Variant {
  id: string;
  name: string;
  /** Price offset in the same cents and currency as the resolved product price. */
  priceOffset: number;
  stock: number;
}

interface PurchaseZoneProps {
  productId: string;
  productSlug: string;
  price: ResolvedPrice;
  currency: Currency;
  variants: Variant[];
  productName: string;
  productImage: string;
  productStatus: ProductStatus;
  isAvailable: boolean;
  stock?: number;
  description?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
}

function asUsdMajor(amountCents: number, currency: Currency, rate: number | null): number | null {
  if (!Number.isFinite(amountCents) || amountCents < 0) return null;
  if (currency === "USD") return amountCents / 100;
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return null;
  return amountCents / 100 / rate;
}

export function PurchaseZone({
  productId,
  productSlug,
  price,
  currency,
  variants,
  productName,
  productImage,
  productStatus,
  isAvailable,
  stock,
  description = null,
  categoryName = null,
  categorySlug = null,
}: PurchaseZoneProps) {
  const router = useRouter();
  const addItem = useCart((state) => state.addItem);
  const rate = useCurrencyStore((state) => state.rate);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants.length === 1 && variants[0].stock > 0 ? variants[0].id : null,
  );
  const [isBuying, setIsBuying] = useState(false);

  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);
  const finalPriceCents = Math.max(0, price.amount + (selectedVariant?.priceOffset ?? 0));
  const compareAtCents = price.compareAtPrice == null
    ? null
    : Math.max(0, price.compareAtPrice + (selectedVariant?.priceOffset ?? 0));
  const selectedStock = selectedVariant?.stock ?? stock;
  const canPurchase = productStatus === "PUBLISHED" &&
    (variants.length > 0 ? selectedVariant !== undefined && selectedVariant.stock > 0 : isAvailable);

  function handleAddToCart(): boolean {
    if (productStatus !== "PUBLISHED") {
      toast.error("Ce produit n'est pas disponible à l'achat");
      return false;
    }
    if (variants.length > 0 && !selectedVariant) {
      toast.error("Veuillez sélectionner une variante");
      return false;
    }
    if (!canPurchase) {
      toast.error("Cette option est en rupture de stock");
      return false;
    }

    const usdPrice = asUsdMajor(finalPriceCents, currency, rate);
    if (usdPrice === null || usdPrice <= 0) {
      toast.error(currency === "CDF" ? "Le taux de change n'est pas disponible" : "Le prix de ce produit est invalide");
      return false;
    }

    const cartProduct: CatalogProduct & { stock?: number } = {
      id: productId,
      name: productName,
      slug: productSlug,
      description,
      price: usdPrice,
      currency: "USD",
      basePrice: usdPrice,
      image: productImage || "/placeholder.webp",
      basePriceUSD: usdPrice,
      basePriceCDF: usdPrice,
      isAvailable: true,
      ...(selectedStock !== undefined ? { stock: selectedStock } : {}),
      availabilityStatus: "in_stock",
      categoryName,
      categorySlug,
      status: productStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      accessPolicy: { visibility: "public", minRbacLevel: 7, requiresAuth: false },
      isPromoted: compareAtCents !== null && compareAtCents > finalPriceCents,
      isNewArrival: false,
      discountPercent: 0,
      variantCount: variants.length,
      hasAvailableVariant: variants.some((variant) => variant.stock > 0),
    };

    addItem(cartProduct, 1, selectedVariant?.id);
    toast.success(`${productName} ajouté au panier`, {
      icon: <CheckCircle2 className="text-emerald-500" />,
    });
    return true;
  }

  function handleBuyNow() {
    if (!handleAddToCart()) return;
    setIsBuying(true);
    router.push("/checkout");
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-cyan-100 bg-white/50 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wider text-cyan-600">Prix actuel</span>
        <Price amount={finalPriceCents} originalAmount={compareAtCents} currency={currency} size="xl" />
      </div>

      {variants.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {variants.map((variant) => {
            const inStock = Number.isSafeInteger(variant.stock) && variant.stock > 0;
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedVariantId(variant.id)}
                disabled={!inStock}
                aria-pressed={selectedVariantId === variant.id}
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200",
                  selectedVariantId === variant.id
                    ? "border-cyan-500 bg-cyan-50 text-cyan-700 ring-2 ring-cyan-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300",
                  !inStock && "cursor-not-allowed bg-slate-100 opacity-50",
                )}
              >
                {variant.name}
                {inStock && variant.stock <= 5 && (
                  <span className="block text-[10px] text-orange-500">Reste {variant.stock}</span>
                )}
                {!inStock && <span className="block text-[10px]">Épuisé</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-2 flex flex-col gap-3">
        <Button
          onClick={handleAddToCart}
          disabled={!canPurchase}
          variant="outline"
          className="h-12 gap-2 border-cyan-400 text-cyan-700 hover:bg-cyan-50"
        >
          <ShoppingBag className="h-5 w-5" />
          Ajouter au panier
        </Button>
        <Button
          onClick={handleBuyNow}
          disabled={!canPurchase || isBuying}
          className="h-12 gap-2 bg-cyan-500 text-white shadow-lg shadow-cyan-200 transition-all hover:bg-rose-500"
        >
          <CreditCard className="h-5 w-5" />
          {isBuying ? "Chargement..." : "Acheter maintenant"}
        </Button>
      </div>
    </div>
  );
}
