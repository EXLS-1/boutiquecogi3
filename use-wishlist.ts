import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface WishlistItem {
  id: string; // UUID v7 du produit
  name: string;
  price: number;
  image: string;
  slug: string;
  category?: string;
}

interface WishlistState {
  items: WishlistItem[];
  addItem: (product: WishlistItem) => void;
  removeItem: (id: string) => void;
  toggleItem: (product: WishlistItem) => void;
  isInWishlist: (id: string) => boolean;
  clearWishlist: () => void;
  totalItems: number;
}

/**
 * Store Zustand pour la gestion des favoris.
 * Optimisé pour la performance avec persist pour la persistance locale.
 */
export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,

      addItem: (product) => {
        const currentItems = get().items;
        if (!currentItems.find((item) => item.id === product.id)) {
          const updatedItems = [...currentItems, product];
          set({ items: updatedItems, totalItems: updatedItems.length });
        }
      },

      removeItem: (id) => {
        const updatedItems = get().items.filter((item) => item.id !== id);
        set({ items: updatedItems, totalItems: updatedItems.length });
      },

      toggleItem: (product) => {
        get().isInWishlist(product.id)
          ? get().removeItem(product.id)
          : get().addItem(product);
      },

      isInWishlist: (id) => get().items.some((item) => item.id === id),

      clearWishlist: () => set({ items: [], totalItems: 0 }),
    }),
    {
      name: "cogi3-wishlist-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
