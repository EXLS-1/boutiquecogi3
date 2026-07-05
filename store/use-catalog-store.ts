// store/use-catalog-store.ts
/**
 * ce fichier contient le store zustand pour la gestion des filtres,
 * de la wishlist et du quick view dans le catalogue.
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CatalogQueryParams,
} from "@/lib/catalog/catalog-types";

interface CatalogState {
  // ─── Filtres actifs ───────────────────────────────────────────────────────
  readonly activeFilters: Partial<CatalogQueryParams>;
  readonly activeCategory: string | null;

  // ─── Wishlist ─────────────────────────────────────────────────────────────
  readonly wishlistIds: readonly string[];

  // ─── Quick View ───────────────────────────────────────────────────────────
  readonly quickViewProductId: string | null;

  // ─── Actions ──────────────────────────────────────────────────────────────
  readonly setFilters: (filters: Partial<CatalogQueryParams>) => void;
  readonly clearFilters: () => void;
  readonly setActiveCategory: (slug: string | null) => void;
  readonly toggleWishlist: (productId: string) => void;
  readonly isInWishlist: (productId: string) => boolean;
  readonly setQuickViewProduct: (id: string | null) => void;
}

const initialFilters: Partial<CatalogQueryParams> = {
  limit: 12,
  sortBy: "createdAt",
  sortOrder: "desc",
};

export const useCatalog = create<CatalogState>()(
  persist(
    (set, get) => ({
      activeFilters: initialFilters,
      activeCategory: null,
      wishlistIds: [],
      quickViewProductId: null,

      setFilters: (filters) =>
        set((state) => ({
          activeFilters: { ...state.activeFilters, ...filters },
        })),

      clearFilters: () =>
        set({
          activeFilters: initialFilters,
          activeCategory: null,
        }),

      setActiveCategory: (slug) => set({ activeCategory: slug }),

      toggleWishlist: (productId) =>
        set((state) => ({
          wishlistIds: state.wishlistIds.includes(productId)
            ? state.wishlistIds.filter((id) => id !== productId)
            : [...state.wishlistIds, productId],
        })),

      isInWishlist: (productId) => get().wishlistIds.includes(productId),

      setQuickViewProduct: (id) => set({ quickViewProductId: id }),
    }),
    {
      name: "boutiquecogi3-catalog-store",
      partialize: (state) => ({
        wishlistIds: state.wishlistIds,
        activeFilters: state.activeFilters,
      }),
    },
  ),
);
