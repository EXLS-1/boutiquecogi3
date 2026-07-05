// store/use-category-store.ts
/**
 * ce fichier contient le store zustand pour la gestion de l'état des catégories et
 * des filtres dans le catalogue.
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CategoryState {
  // ─── État ─────────────────────────────────────────────────────────────────
  readonly activeCategorySlug: string | null;
  readonly expandedCategories: readonly string[];
  readonly selectedFilters: readonly string[];
  
  // ─── Actions ──────────────────────────────────────────────────────────────
  readonly setActiveCategory: (slug: string | null) => void;
  readonly toggleExpandedCategory: (slug: string) => void;
  readonly setSelectedFilters: (filters: readonly string[]) => void;
  readonly clearFilters: () => void;
  readonly reset: () => void;
}

const initialState = {
  activeCategorySlug: null,
  expandedCategories: [],
  selectedFilters: [],
};

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set) => ({
      ...initialState,

      setActiveCategory: (slug) => 
        set({ activeCategorySlug: slug }),

      toggleExpandedCategory: (slug) =>
        set((state) => ({
          expandedCategories: state.expandedCategories.includes(slug)
            ? state.expandedCategories.filter((s) => s !== slug)
            : [...state.expandedCategories, slug],
        })),

      setSelectedFilters: (filters) =>
        set({ selectedFilters: filters }),

      clearFilters: () =>
        set({ selectedFilters: [], activeCategorySlug: null }),

      reset: () => set(initialState),
    }),
    {
      name: "boutiquecogi3-category-store",
      partialize: (state) => ({
        expandedCategories: state.expandedCategories,
      }),
    }
  )
);

// ─── Sélecteurs optimisés ────────────────────────────────────────────────────
export const selectActiveCategory = (state: CategoryState) => 
  state.activeCategorySlug;

export const selectHasActiveFilters = (state: CategoryState) => 
  state.selectedFilters.length > 0 || state.activeCategorySlug !== null;