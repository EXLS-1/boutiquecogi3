// app/wishlist/page.tsx
// This is a client component for the Wishlist page. It displays the user's saved products and allows them to add all items to the cart or clear the wishlist. It also handles the case when the wishlist is empty, showing a friendly message and a link to the products page.

"use client";

import React, { useEffect, useState } from "react";
import { useWishlist } from "@/store/use-wishlist";
import useCart from "@/store/use-cart";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, HeartOff, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";

export default function WishlistPage() {
  const [mounted, setMounted] = useState(false);
  const { items, removeItem, clearWishlist } = useWishlist();
  const { addItem: addToCart } = useCart();

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const handleAddAllToCart = () => {
    if (items.length === 0) return;
    
    items.forEach((product) => {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
        variantId: product.id // Simplification pour l'exemple
      });
    });
    
    toast.success(`${items.length} produits ajoutés au panier`);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <HeartOff className="h-16 w-16 text-slate-300" />
        <h1 className="text-2xl font-semibold text-slate-700">Votre liste est vide</h1>
        <p className="text-slate-500">Vous n'avez pas encore ajouté de coups de cœur.</p>
        <Button asChild className="bg-cyan-600 hover:bg-cyan-700">
          <Link href="/products">Visitez la boutique</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mes Favoris</h1>
          <p className="text-slate-500">{items.length} article(s) sauvegardé(s)</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={clearWishlist} className="text-rose-500 border-rose-200 hover:bg-rose-50">
            <Trash2 className="h-4 w-4 mr-2" /> Vider
          </Button>
          <Button onClick={handleAddAllToCart} className="bg-cyan-600 hover:bg-cyan-700">
            <ShoppingCart className="h-4 w-4 mr-2" /> Tout ajouter au panier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item) => (
          <div key={item.id} className="group relative border rounded-xl overflow-hidden bg-white hover:shadow-lg transition-shadow">
            <div className="relative h-48 w-full overflow-hidden">
              <Image
                src={item.image || "/placeholder.webp"}
                alt={item.name}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform group-hover:scale-105"
              />
              <button 
                onClick={() => removeItem(item.id)}
                className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-full text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <h3 className="font-medium text-slate-900 line-clamp-1">{item.name}</h3>
              <p className="text-cyan-700 font-bold mt-1">{item.price.toLocaleString()} USD</p>
              <Button asChild variant="link" className="px-0 text-slate-500 hover:text-cyan-600">
                <Link href={`/products/${item.slug}`}>
                  Voir le produit <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
