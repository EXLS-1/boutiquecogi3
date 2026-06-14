// components/price/purchase-zone.tsx
// Ce composant gère la logique de sélection de variantes (taille/couleur) et les actions d'achat pour un produit.
// Il centralise la gestion du prix final en fonction de la variante sélectionnée, et intègre les interactions d'ajout au panier et d'achat immédiat.
// La structure est conçue pour être claire et maintenable, avec une séparation nette entre la logique de sélection et les actions d'achat.

"use client";

import React, { useState } from "react";
import { ShoppingBag, CreditCard, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/price/price";
import useCart from "@/store/use-cart";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils/utils";

interface Variant {
  id: string; // UUID v7
  name: string; // ex: "Bleu / XL"
  priceOffset: number; // Différence par rapport au prix de base en cents
  stock: number;
}

interface PurchaseZoneProps {
  productId: string;
  basePrice: number; // en cents
  variants: Variant[];
  productName: string;
  productImage: string;
}

/**
 * Gestionnaire de sélection et d'achat.
 * Centralise la logique d'identification du produit et l'action d'achat.
 */
export function PurchaseZone({
  productId,
  basePrice,
  variants,
  productName,
  productImage,
}: PurchaseZoneProps) {
  const router = useRouter();
  const addItem = useCart((state) => state.addItem);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants.length === 1 ? variants[0].id : null
  );
  const [isBuying, setIsBuying] = useState(false);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const finalPrice = basePrice + (selectedVariant?.priceOffset || 0);

  const handleAddToCart = () => {
    if (!selectedVariantId) {
      toast.error("Veuillez sélectionner une option (taille/couleur)");
      return;
    }

    addItem({
      id: productId,
      name: productName,
      price: finalPrice,
      image: productImage,
      quantity: 1,
    });

    toast.success(`${productName} ajouté au panier`, {
      icon: <CheckCircle2 className="text-emerald-500" />,
    });
  };

  const handleBuyNow = async () => {
    if (!selectedVariantId) {
      toast.error("Veuillez sélectionner une option");
      return;
    }

    setIsBuying(true);
    // On ajoute au panier et on redirige vers le checkout directement
    handleAddToCart();
    router.push("/checkout");
  };

  return (
    <div className="flex flex-col gap-6 p-4 border border-cyan-100 rounded-2xl bg-white/50 backdrop-blur-sm shadow-sm">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-cyan-600 uppercase tracking-wider">Prix actuel</span>
        <Price amount={finalPrice} size="xl" />
      </div>

      {/* Sélection de Variants */}
      <div className="grid grid-cols-2 gap-3">
        {variants.map((variant) => (
          <button
            key={variant.id}
            onClick={() => setSelectedVariantId(variant.id)}
            disabled={variant.stock <= 0}
            className={cn(
              "px-4 py-3 text-sm font-medium rounded-xl border transition-all duration-200",
              selectedVariantId === variant.id
                ? "border-cyan-500 bg-cyan-50 text-cyan-700 ring-2 ring-cyan-500/20"
                : "border-slate-200 bg-white hover:border-cyan-300 text-slate-600",
              variant.stock <= 0 && "opacity-50 cursor-not-allowed bg-slate-100"
            )}
          >
            {variant.name}
            {variant.stock <= 5 && variant.stock > 0 && (
              <span className="block text-[10px] text-orange-500">Reste {variant.stock}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 mt-2">
        <Button 
          onClick={handleAddToCart}
          variant="outline" 
          className="h-12 border-cyan-400 text-cyan-700 hover:bg-cyan-50 gap-2"
        >
          <ShoppingBag className="w-5 h-5" />
          Ajouter au panier
        </Button>
        
        <Button 
          onClick={handleBuyNow}
          disabled={isBuying}
          className="h-12 bg-cyan-500 hover:bg-rose-500 text-white shadow-lg shadow-cyan-200 transition-all gap-2"
        >
          <CreditCard className="w-5 h-5" />
          {isBuying ? "Chargement..." : "Acheter maintenant"}
        </Button>
      </div>
    </div>
  );
}