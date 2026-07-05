// store/use-catalog-store.ts
/**
 * Store Zustand unique pour le catalogue.
 * Gère : filtres de requête, filtres de facettes, catégorie active,
 * arborescence dépliée, wishlist et quick view.
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CatalogQueryParams } from "@/lib/catalog/catalog-types";

/* ─────────────────────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────────────────────── */

interface CatalogState {
  // ─── Filtres de requête API (pagination, tri, fourchette de prix, etc.) ───
  readonly activeFilters: Partial<CatalogQueryParams>;

  // ─── Filtres de facettes (tags, marques, attributs sélectionnés) ──────────
  readonly selectedFilters: readonly string[];

  // ─── Catégorie active ─────────────────────────────────────────────────────
  readonly activeCategory: string | null;

  // ─── Catégories dépliées dans l'arborescence ──────────────────────────────
  readonly expandedCategories: readonly string[];

  // ─── Wishlist ─────────────────────────────────────────────────────────────
  readonly wishlistIds: readonly string[];

  // ─── Quick View ───────────────────────────────────────────────────────────
  readonly quickViewProductId: string | null;

  // ─── Actions ──────────────────────────────────────────────────────────────
  readonly setFilters: (filters: Partial<CatalogQueryParams>) => void;
  readonly setSelectedFilters: (filters: readonly string[]) => void;
  readonly toggleSelectedFilter: (filterId: string) => void;
  readonly clearFilters: () => void;

  readonly setActiveCategory: (slug: string | null) => void;
  readonly toggleExpandedCategory: (slug: string) => void;

  readonly toggleWishlist: (productId: string) => void;
  readonly isInWishlist: (productId: string) => boolean;

  readonly setQuickViewProduct: (id: string | null) => void;

  readonly reset: () => void;
}

/* ─────────────────────────────────────────────────────────────────────────────
   État initial
   ───────────────────────────────────────────────────────────────────────────── */

const initialFilters: Partial<CatalogQueryParams> = {
  limit: 12,
  sortBy: "createdAt",
  sortOrder: "desc",
};

const initialState = {
  activeFilters: initialFilters,
  selectedFilters: [] as readonly string[],
  activeCategory: null as string | null,
  expandedCategories: [] as readonly string[],
  wishlistIds: [] as readonly string[],
  quickViewProductId: null as string | null,
};

/* ─────────────────────────────────────────────────────────────────────────────
   Store
   ───────────────────────────────────────────────────────────────────────────── */

export const useCatalog = create<CatalogState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Filtres de requête
      setFilters: (filters) =>
        set((state) => ({
          activeFilters: { ...state.activeFilters, ...filters },
        })),

      // Filtres de facettes
      setSelectedFilters: (filters) =>
        set({ selectedFilters: filters }),

      toggleSelectedFilter: (filterId) =>
        set((state) => ({
          selectedFilters: state.selectedFilters.includes(filterId)
            ? state.selectedFilters.filter((id) => id !== filterId)
            : [...state.selectedFilters, filterId],
        })),

      // Réinitialise les filtres + catégorie (garde wishlist & arborescence)
      clearFilters: () =>
        set({
          activeFilters: initialFilters,
          selectedFilters: [],
          activeCategory: null,
        }),

      // Catégorie
      setActiveCategory: (slug) => set({ activeCategory: slug }),

      // Arborescence
      toggleExpandedCategory: (slug) =>
        set((state) => ({
          expandedCategories: state.expandedCategories.includes(slug)
            ? state.expandedCategories.filter((s) => s !== slug)
            : [...state.expandedCategories, slug],
        })),

      // Wishlist
      toggleWishlist: (productId) =>
        set((state) => ({
          wishlistIds: state.wishlistIds.includes(productId)
            ? state.wishlistIds.filter((id) => id !== productId)
            : [...state.wishlistIds, productId],
        })),

      isInWishlist: (productId) => get().wishlistIds.includes(productId),

      // Quick view
      setQuickViewProduct: (id) => set({ quickViewProductId: id }),

      // Reset total
      reset: () => set(initialState),
    }),
    {
      name: "boutiquecogi3-catalog-store",
      partialize: (state) => ({
        wishlistIds: state.wishlistIds,
        activeFilters: state.activeFilters,
        expandedCategories: state.expandedCategories,
      }),
    }
  )
);

/* ─────────────────────────────────────────────────────────────────────────────
   Sélecteurs optimisés (hors du store pour éviter les re-renders inutiles)
   ───────────────────────────────────────────────────────────────────────────── */

export const selectActiveCategory = (state: CatalogState) => state.activeCategory;

export const selectHasActiveFilters = (state: CatalogState) =>
  state.selectedFilters.length > 0 || state.activeCategory !== null;