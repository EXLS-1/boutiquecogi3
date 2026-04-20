"use client";

import Image from "next/image";
import useCart from "@/store/use-cart";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

// Types extraits proprement en dehors du composant
type QuantityAction = "increase" | "decrease";

interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export default function CartPage() {
  const cart = useCart();

  // Optimisation des performances : mémorisation du calcul du total
  const cartTotal = useMemo(() => {
    return cart.items.reduce(
      (total: number, item: CartItem) => total + item.price * item.quantity,
      0
    );
  }, [cart.items]);

  // Formatage robuste de la devise
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR", // À adapter en XOF si nécessaire
    }).format(price);
  };

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center">
        <h1 className="font-playfair text-3xl font-bold mb-6 tracking-widest uppercase text-[var(--turquoise)]">
          Mon Panier
        </h1>
        <p className="font-lato text-[var(--text-secondary)] text-lg">
          Votre panier est actuellement vide.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="font-playfair text-3xl font-bold mb-8 tracking-widest uppercase text-[var(--turquoise)] border-b border-[var(--border)] pb-4">
        Mon Panier
      </h1>

      <div className="space-y-6">
        {cart.items.map((item: CartItem) => (
          <div
            key={item.id}
            className="flex flex-col sm:flex-row items-center justify-between border border-[var(--border)] rounded-[var(--radius)] p-4 bg-[var(--card)] shadow-sm"
          >
            {/* Informations Produit */}
            <div className="flex items-center space-x-6 w-full sm:w-auto">
              <div className="relative w-20 h-20 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)]">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
              <div>
                <h2 className="font-playfair text-xl font-bold text-[var(--text-primary)]">
                  {item.name}
                </h2>
                <p className="font-lato font-bold text-[var(--turquoise)] mt-1">
                  {formatPrice(item.price)}
                </p>
              </div>
            </div>

            {/* Contrôles et Actions */}
            <div className="flex items-center space-x-6 mt-4 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
              {/* Contrôle des quantités */}
              <div className="flex items-center gap-x-4 border border-[var(--border)] rounded-[var(--radius-sm)] px-2 py-1 bg-[var(--background)]">
                <button
                  onClick={() => cart.updateQuantity(item.id, "decrease")}
                  disabled={item.quantity <= 1}
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--rose)] disabled:opacity-50 transition-colors focus:outline-none"
                  aria-label="Diminuer la quantité"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-lato font-bold w-6 text-center text-[var(--text-primary)]">
                  {item.quantity}
                </span>
                <button
                  onClick={() => cart.updateQuantity(item.id, "increase")}
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--rose)] transition-colors focus:outline-none"
                  aria-label="Augmenter la quantité"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Suppression */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => cart.removeItem(item.id)}
                className="text-[var(--text-secondary)] hover:text-[var(--rose)] hover:bg-[var(--rose)]/10"
                aria-label={`Supprimer ${item.name} du panier`}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        ))}

        {/* Section Récapitulatif */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-10 pt-6 border-t border-[var(--border)] gap-6">
          <Button
            variant="outline"
            onClick={cart.removeAll}
            className="border-[var(--turquoise)] text-[var(--turquoise)] hover:bg-[var(--rose)] hover:border-[var(--rose)] hover:text-white font-bold tracking-widest uppercase transition-all w-full sm:w-auto"
          >
            Vider le panier
          </Button>
          
          <div className="flex items-center space-x-4 bg-[var(--background)] border border-[var(--border)] px-6 py-4 rounded-[var(--radius)] shadow-sm w-full sm:w-auto justify-between">
            <span className="font-lato text-[var(--text-secondary)] uppercase tracking-wider text-sm font-bold">
              Total estimé
            </span>
            <span className="font-playfair text-2xl font-bold text-[var(--turquoise)]">
              {formatPrice(cartTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}