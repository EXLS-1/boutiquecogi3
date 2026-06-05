// store/use-wishlist.ts
// This store manages the wishlist items using Zustand with persistence in localStorage. It provides functions to add, remove, toggle items in the wishlist, and to check if an item is already in the wishlist. The store also keeps track of the total number of items for easy access in the UI.
// The `useWishlist` hook is designed to be used throughout the application to interact with the wishlist state.

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
  setItems: (items: WishlistItem[]) => void;
  clearWishlist: () => void;
  totalItems: number;
}

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

      setItems: (items) => set({ items, totalItems: items.length }),

      clearWishlist: () => set({ items: [], totalItems: 0 }),
    }),
    {
      name: "cogi3-wishlist-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
