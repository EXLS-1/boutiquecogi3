// components/product/product-detail.tsx

"use client";

import Image from "next/image";
import { Product } from "@/types/products";
import useCart from "@/store/use-cart";
import { useCurrencyStore } from "@/store/use-currency-store";
import toast from "react-hot-toast";
import { formatPrice } from "@/lib/currency/currency";
import { Minus, Plus, ShoppingCart } from "lucide-react";

interface Props {
  product: Product;
}

export const ProductDetail = ({ product }: Props) => {
  const { addItem, items, updateQuantity } = useCart();
  const currency = useCurrencyStore((s) => s.currency);
  
  const cartItem = items.find((i) => i.id === product.id);
  const quantity = cartItem?.quantity ?? 1;

  const rawPrice = currency === "CDF" ? product.priceCDF : product.priceUSD;

  const handleAdd = () => {
    addItem({ ...product, quantity });
    toast.success("Produit ajouté au panier");
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 grid lg:grid-cols-2 gap-10">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>

      <div className="space-y-8 flex flex-col justify-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-playfair font-bold text-foreground">
            {product.name}
          </h1>
          <p className="text-3xl font-semibold text-rose-500">
            {formatPrice(rawPrice, currency)}
          </p>
        </div>

        <p className="text-muted-foreground leading-relaxed">
          {product.description}
        </p>

        <div className="flex items-center gap-6 pt-4 border-t border-border">
          <div className="flex items-center border border-border rounded-md">
            <button 
              onClick={() => updateQuantity(product.id, "decrease")}
              className="p-3 hover:bg-muted transition-colors disabled:opacity-50"
              disabled={quantity <= 1}
              aria-label="Diminuer la quantité"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-12 text-center font-medium select-none">{quantity}</span>
            <button 
              onClick={() => updateQuantity(product.id, "increase")}
              className="p-3 hover:bg-muted transition-colors disabled:opacity-50"
              disabled={quantity >= product.stock}
              aria-label="Augmenter la quantité"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleAdd}
            disabled={product.stock <= 0}
            className="flex-1 bg-primary text-primary-foreground flex items-center justify-center gap-3 px-8 py-4 rounded-md font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="h-5 w-5" />
            {product.stock > 0 ? "Ajouter au panier" : "Rupture de stock"}
          </button>
        </div>
      </div>
    </div>
  );
};