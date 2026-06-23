/**
 * =============================================================================
 * PRODUCT DETAIL - Organisme - Boutiquecogi3
 * =============================================================================
 * Page détail produit avec galerie, sélection quantité,
 * ajout panier, et gestion devise CDF/USD.
 */

"use client";

import { useState, useCallback, memo } from "react";
import Image from "next/image";
import { useCartStore } from "@/store/use-cart";
import { useCurrencyStore } from "@/store/use-currency-store";
import { toast } from "sonner";
import { formatPrice } from "@/lib/currency/exchange-rate-currency";
import { 
  Minus, 
  Plus, 
  ShoppingCart, 
  Heart, 
  Share2, 
  Truck, 
  ShieldCheck, 
  RotateCcw 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Product } from "@/lib/product/product-types";

// ─── Props ────────────────────────────────────────────────────────────────────
interface ProductDetailProps {
  readonly product: Product;
}

// ─── Sous-composants atomiques ────────────────────────────────────────────────

const ProductGallery = memo(function ProductGallery({ 
  images, 
  productName 
}: { 
  readonly images: readonly string[]; 
  readonly productName: string; 
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const displayImages = images.length > 0 ? images : ["/placeholder.webp"];

  return (
    <div className="space-y-4">
      {/* Image principale */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted border">
        <Image
          src={displayImages[selectedIndex]}
          alt={`${productName} - Vue ${selectedIndex + 1}`}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          priority
        />
        {displayImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {displayImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setSelectedIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === selectedIndex ? "w-8 bg-white" : "w-2 bg-white/50"
                }`}
                aria-label={`Voir image ${i + 1}`}
                aria-current={i === selectedIndex}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {displayImages.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {displayImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                i === selectedIndex ? "border-cyan-600" : "border-transparent hover:border-slate-300"
              }`}
              aria-label={`Sélectionner image ${i + 1}`}
            >
              <Image
                src={img}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

const QuantitySelector = memo(function QuantitySelector({
  quantity,
  onIncrease,
  onDecrease,
  max,
  disabled,
}: {
  readonly quantity: number;
  readonly onIncrease: () => void;
  readonly onDecrease: () => void;
  readonly max: number;
  readonly disabled: boolean;
}) {
  return (
    <div className="flex items-center border border-border rounded-lg bg-background">
      <Button
        variant="ghost"
        size="icon"
        onClick={onDecrease}
        disabled={disabled || quantity <= 1}
        className="h-12 w-12 rounded-none rounded-l-lg"
        aria-label="Diminuer la quantité"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span 
        className="w-16 text-center font-semibold text-lg select-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {quantity}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onIncrease}
        disabled={disabled || quantity >= max}
        className="h-12 w-12 rounded-none rounded-r-lg"
        aria-label="Augmenter la quantité"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
});

// ─── Composant Principal ──────────────────────────────────────────────────────

export const ProductDetail = memo(function ProductDetail({ product }: ProductDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  const { addItem, isInCart, getItemQuantity } = useCartStore();
  const currency = useCurrencyStore((s) => s.currency);
  
  const cartQuantity = getItemQuantity(product.id);
  const alreadyInCart = isInCart(product.id);
  
  // Prix affiché avec remise
  const basePrice = currency === "CDF" ? product.priceCDF : product.priceUSD;
  const discountedPrice = product.discountPercent > 0
    ? basePrice * (1 - product.discountPercent / 100)
    : basePrice;

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleIncrease = useCallback(() => {
    setQuantity((q) => Math.min(q + 1, product.stock, 99));
  }, [product.stock]);

  const handleDecrease = useCallback(() => {
    setQuantity((q) => Math.max(q - 1, 1));
  }, []);

  const handleAddToCart = useCallback(() => {
    if (product.stock <= 0) {
      toast.error("Ce produit est en rupture de stock");
      return;
    }

    addItem(product, quantity);
    
    toast.success(
      `${product.name} ajouté au panier`,
      {
        description: `Quantité: ${quantity} × ${formatPrice(discountedPrice, currency)}`,
        action: {
          label: "Voir le panier",
          onClick: () => useCartStore.getState().openCart(),
        },
      }
    );
  }, [product, quantity, addItem, discountedPrice, currency]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié dans le presse-papiers");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  }, []);

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <article className="max-w-6xl mx-auto py-10 px-4">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
        
        {/* ─── Colonne Gauche : Galerie ───────────────────────────────────── */}
        <ProductGallery 
          images={product.images.length > 0 ? product.images : [product.image]} 
          productName={product.name} 
        />

        {/* ─── Colonne Droite : Infos ───────────────────────────────────── */}
        <div className="space-y-6 flex flex-col">
          
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {product.isNewArrival && (
              <Badge className="bg-emerald-500 hover:bg-emerald-600">Nouveau</Badge>
            )}
            {product.discountPercent > 0 && (
              <Badge variant="destructive">-{product.discountPercent}%</Badge>
            )}
            {isOutOfStock ? (
              <Badge variant="secondary" className="bg-slate-800 text-white">Épuisé</Badge>
            ) : isLowStock ? (
              <Badge variant="secondary" className="bg-amber-500 text-white">Stock limité</Badge>
            ) : (
              <Badge variant="outline" className="text-cyan-700 border-cyan-300">
                <Truck className="h-3 w-3 mr-1" />
                En stock
              </Badge>
            )}
          </div>

          {/* Titre & Catégorie */}
          <div>
            {product.category && (
              <span className="text-sm font-medium text-cyan-600 uppercase tracking-wide">
                {product.category}
              </span>
            )}
            <h1 className="text-3xl md:text-4xl font-playfair font-bold text-foreground mt-2">
              {product.name}
            </h1>
          </div>

          {/* Prix */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-rose-600">
              {formatPrice(discountedPrice, currency)}
            </span>
            {product.discountPercent > 0 && (
              <span className="text-lg text-slate-400 line-through">
                {formatPrice(basePrice, currency)}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-muted-foreground leading-relaxed text-base">
            {product.description || "Aucune description disponible pour ce produit."}
          </p>

          <Separator />

          {/* Actions */}
          <div className="space-y-6">
            
            {/* Sélecteur quantité + Panier */}
            <div className="flex flex-col sm:flex-row gap-4">
              <QuantitySelector
                quantity={quantity}
                onIncrease={handleIncrease}
                onDecrease={handleDecrease}
                max={product.stock}
                disabled={isOutOfStock}
              />
              
              <Button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="flex-1 h-12 bg-cyan-600 hover:bg-cyan-700 text-white font-bold uppercase tracking-wider"
                size="lg"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {isOutOfStock 
                  ? "Rupture de stock" 
                  : alreadyInCart 
                    ? `Ajouter (${cartQuantity} déjà)` 
                    : "Ajouter au panier"
                }
              </Button>
            </div>

            {/* Actions secondaires */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                className={`flex-1 ${isWishlisted ? "text-rose-600 border-rose-300 bg-rose-50" : ""}`}
                onClick={() => setIsWishlisted((w) => !w)}
              >
                <Heart className={`h-5 w-5 mr-2 ${isWishlisted ? "fill-current" : ""}`} />
                {isWishlisted ? "Favori" : "Ajouter aux favoris"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={handleShare}
                aria-label="Partager le produit"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Garanties */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-cyan-600" />
              <span>Livraison rapide</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-600" />
              <span>Paiement sécurisé</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-cyan-600" />
              <span>Retour sous 14 jours</span>
            </div>
          </div>

        </div>
      </div>
    </article>
  );
});

ProductDetail.displayName = "ProductDetail";