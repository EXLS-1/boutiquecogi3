// store/admin/products/product-list.store.ts
// ═════════════════════════════════════════════════════════════════════════════
// STORE — Liste des produits (filtres, pagination UI)
// ═════════════════════════════════════════════════════════════════════════════
// Zustand store pour l'état UI de la liste. Ne contient JAMAIS les données
// sensibles (prix, stock, statut) — seulement les paramètres de requête.

import { create } from "zustand";

export interface ProductListState {
  // Pagination
  page: number;
  limit: number;
  total: number;
  totalPages: number;

  // Filtres
  search: string;
  status: string[];
  productTypeId: string | null;
  categoryId: string | null;
  sortBy: "createdAt" | "name" | "status" | "sku" | "publishedAt";
  sortOrder: "asc" | "desc";

  // Sélection
  selectedIds: Set<string>;

  // Chargement
  isLoading: boolean;
  error: string | null;

  // Actions
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setStatusFilter: (status: string[]) => void;
  setProductTypeFilter: (id: string | null) => void;
  setCategoryFilter: (id: string | null) => void;
  setSortBy: (field: "createdAt" | "name" | "status" | "sku" | "publishedAt") => void;
  setSortOrder: (order: "asc" | "desc") => void;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: Omit<ProductListState, keyof ProductListState & "actions"> = {
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0,
  search: "",
  status: [],
  productTypeId: null,
  categoryId: null,
  sortBy: "createdAt",
  sortOrder: "desc",
  selectedIds: new Set(),
  isLoading: false,
  error: null,
};

export const useProductListStore = create<ProductListState>((set) => ({
  ...initialState,

  setPage: (page) => set({ page: Math.max(1, page) }),
  setLimit: (limit) => set({ limit: Math.max(1, Math.min(100, limit)), page: 1 }),
  setSearch: (search) => set({ search, page: 1 }),
  setStatusFilter: (status) => set({ status, page: 1 }),
  setProductTypeFilter: (productTypeId) => set({ productTypeId, page: 1 }),
  setCategoryFilter: (categoryId) => set({ categoryId, page: 1 }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),

  toggleSelection: (id) =>
    set((state) => {
      const newSelected = new Set(state.selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { selectedIds: newSelected };
    }),

  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set() }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),

  reset: () => set(initialState),
}));