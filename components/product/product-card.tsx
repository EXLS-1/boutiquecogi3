// components/product/product-card.tsx
/**
 * =============================================================================
 * PRODUCT CARD - Atome - Boutiquecogi3
 * =============================================================================
 * Carte produit réutilisable avec badges, prix CDF/USD, et états.
 */

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import { Heart, Eye, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BadgeProductStatus } from "./badge";
import { CatalogProduct } from "@/lib/catalog/catalog-types";
import { useCatalog } from "@/store/use-catalog-store";
import Price from "@/components/product-price/price";

interface ProductCardProps {
  readonly product: CatalogProduct;
  readonly showBadge?: boolean;
  readonly priority?: boolean;
}

function ProductCardComponent({ product, showBadge = true, priority = false }: ProductCardProps) {
  const { toggleWishlist, isInWishlist, setQuickViewProduct } = useCatalog();

  const isWishlisted = isInWishlist(product.id);

  return (
    <article className="group relative flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm 
                        hover:shadow-xl hover:border-cyan-400/30 transition-all duration-300 overflow-hidden">
      
      {/* ─── Image Container ───────────────────────────────────────────────── */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
        <Link href={`/products/${product.slug}`} aria-label={`Voir ${product.name}`}>
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            priority={priority}
          />
        </Link>

        {/* Badges */}
        {showBadge && (
          <div className="absolute top-3 left-3">
            <BadgeProductStatus product={product} />
          </div>
        )}

        {/* Actions rapides (hover) */}
        <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-0 translate-x-2 
                        group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          <Button
            size="icon"
            variant="secondary"
            className={`h-9 w-9 rounded-full shadow-md ${isWishlisted ? "bg-rose-100 text-rose-600" : ""}`}
            onClick={() => toggleWishlist(product.id)}
            aria-label={isWishlisted ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-9 w-9 rounded-full shadow-md"
            onClick={() => setQuickViewProduct(product.id)}
            aria-label="Aperçu rapide"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ─── Content ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-4">
        {product.categoryName && (
          <span className="text-xs font-medium text-cyan-600 uppercase tracking-wide mb-1">
            {product.categoryName}
          </span>
        )}
        
        <Link href={`/products/${product.slug}`} className="group/link">
          <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2 
                         group-hover/link:text-cyan-700 transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Prix */}
        <div className="mt-auto pt-3 flex items-baseline gap-2">
          <span className="text-lg font-bold text-slate-900">
            <Price amount={displayPriceUSD} />
          </span>
          {product.discountPercent > 0 }
        </div>

        {/* CTA */}
        <Button
          className="mt-3 w-full bg-cyan-600 hover:bg-cyan-700 text-white"
          disabled={!product.isAvailable}
          aria-label={product.isAvailable ? "Ajouter au panier" : "Produit indisponible"}
        >
          <ShoppingBag className="h-4 w-4 mr-2" />
          {product.isAvailable ? "Ajouter" : "Indisponible"}
        </Button>
      </div>
    </article>
  );
}

export const ProductCard = memo(ProductCardComponent);
ProductCard.displayName = "ProductCard";