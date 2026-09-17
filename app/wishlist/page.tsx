// app/wishlist/page.tsx
// This is a client component for the Wishlist page. It displays the user's saved products and allows them to add all items to the cart or clear the wishlist. It also handles the case when the wishlist is empty, showing a friendly message and a link to the products page.

"use client";

import { useState } from "react";
import { useMounted } from "@/hooks/use-mounted";
import { useWishlist } from "@/store/use-wishlist";
import useCart from "@/store/use-cart";
import { resolveCartProductsAction } from "@/lib/actions/cart.actions";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, HeartOff, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { clearWishlistAction, removeWishlistItemAction } from "@/lib/actions/wishlist.actions";

export default function WishlistPage() {
  const mounted = useMounted();
  const { items, removeItem, clearWishlist, setItems } = useWishlist();
  const { addItem: addToCart } = useCart();
  const [isAddingAll, setIsAddingAll] = useState(false);

  if (!mounted) return null;

  const handleAddAllToCart = async () => {
    if (items.length === 0 || isAddingAll) return;

    setIsAddingAll(true);

    try {
      // Le panier exige des `CatalogProduct` COMPLETS (`isAvailable`, prix
      // CDF/USD, remise, politique d'accès…). La wishlist ne conserve que
      // l'essentiel : on résout donc les produits depuis le catalogue via une
      // Server Action, au lieu de fabriquer un objet partiel côté client
      // (source du TS2353 et d'ajouts silencieusement ignorés).
      const result = await resolveCartProductsAction(
        items.map((item) => item.slug || item.id),
      );

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      let addedCount = 0;
      let skippedCount = 0;

      for (const product of result.products) {
        // Le store refuse les produits indisponibles : on le dit à
        // l'utilisateur au lieu de laisser un échec silencieux.
        if (!product.isAvailable) {
          skippedCount += 1;
          continue;
        }

        // La quantité est le 2ᵉ argument de `addItem` — elle n'appartient
        // pas au produit (`CatalogProduct`).
        addToCart(product, 1);
        addedCount += 1;
      }

      // Favoris dépubliés / supprimés / introuvables côté catalogue.
      skippedCount += result.missingIds.length;

      if (addedCount === 0) {
        toast.error("Aucun favori disponible n'a pu être ajouté au panier");
        return;
      }

      toast.success(
        skippedCount === 0
          ? `${addedCount} produit(s) ajouté(s) au panier`
          : `${addedCount} produit(s) ajouté(s) • ${skippedCount} ignoré(s) : indisponible ou introuvable`,
      );
    } catch (error) {
      console.error("Ajout des favoris au panier impossible:", error);
      toast.error("Impossible d'ajouter les favoris au panier");
    } finally {
      setIsAddingAll(false);
    }
  };

  const handleRemove = async (id: string) => {
    const item = items.find((wishlistItem) => wishlistItem.id === id);
    if (!item) return;
    removeItem(id);
    const result = await removeWishlistItemAction(id);
    if (result.success) setItems(result.items);
    else if (result.error !== "Non authentifié") {
      useWishlist.getState().addItem(item);
      toast.error(result.error);
    }
  };

  const handleClear = async () => {
    const previousItems = items;
    clearWishlist();
    const result = await clearWishlistAction();
    if (result.success) setItems(result.items);
    else if (result.error !== "Non authentifié") {
      setItems(previousItems);
      toast.error(result.error);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <HeartOff className="h-16 w-16 text-slate-300" />
        <h1 className="text-2xl font-semibold text-slate-700">Votre liste est vide</h1>
        <p className="text-slate-500">Vous n&apos;avez pas encore ajouté de coups de cœur.</p>
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
          <Button variant="outline" onClick={handleClear} className="text-rose-500 border-rose-200 hover:bg-rose-50">
            <Trash2 className="h-4 w-4 mr-2" /> Vider
          </Button>
          <Button
            onClick={handleAddAllToCart}
            disabled={isAddingAll}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {isAddingAll ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ajout en cours…
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Tout ajouter au panier
              </>
            )}
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
                onClick={() => void handleRemove(item.id)}
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
