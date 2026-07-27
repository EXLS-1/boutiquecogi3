// store/admin-deleted-account-store.ts
// ============================================
// ADMIN DELETED ACCOUNT STORE — État centralisé pour le registre des comptes supprimés
// ============================================
// Zustand store pour la gestion du registre avec filtres, tri et pagination.

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─── Types ─────────────────────────────────

export interface DeletedAccountItem {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  deletedBy: string;
  deletedByRole: string;
  reason: string;
  createdAt: Date;
  restoredAt: Date | null;
  restoredBy: string | null;
  restoreNote: string | null;
}

export interface DeletedAccountDetail extends DeletedAccountItem {
  userSnapshot: unknown;
  metadata: unknown | null;
}

export interface RegistryStats {
  totalDeleted: number;
  totalRestored: number;
  deletedToday: number;
  deletedThisWeek: number;
  deletedThisMonth: number;
}

export interface DeletedAccountFiltersState {
  search: string;
  sortBy: "createdAt" | "userEmail" | "deletedBy";
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
}

export interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface AdminDeletedAccountStore {
  // ── Data ──
  entries: DeletedAccountItem[];
  pagination: PaginationInfo;
  filters: DeletedAccountFiltersState;
  isLoading: boolean;
  lastError: string | null;
  currentDetail: DeletedAccountDetail | null;
  stats: RegistryStats | null;

  // ── Actions data ──
  setEntries: (
    entries: DeletedAccountItem[],
    pagination: PaginationInfo
  ) => void;
  setCurrentDetail: (detail: DeletedAccountDetail | null) => void;
  setStats: (stats: RegistryStats | null) => void;
  removeEntry: (entryId: string) => void;
  markRestored: (
    entryId: string,
    restoredBy: string,
    note: string | null
  ) => void;

  // ── Actions UI ──
  setFilter: <K extends keyof DeletedAccountFiltersState>(
    key: K,
    value: DeletedAccountFiltersState[K]
  ) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // ── Computed ──
  getFilteredEntries: () => DeletedAccountItem[];
  getActiveFiltersCount: () => number;
}

// ─── Constants ─────────────────────────────

const DEFAULT_FILTERS: DeletedAccountFiltersState = {
  search: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  pageSize: 25,
};

const DEFAULT_PAGINATION: PaginationInfo = {
  total: 0,
  page: 1,
  pageSize: 25,
  totalPages: 1,
};

// ─── Store ─────────────────────────────────

export const useAdminDeletedAccountStore = create<AdminDeletedAccountStore>()(
  devtools(
    (set, get) => ({
      entries: [],
      pagination: { ...DEFAULT_PAGINATION },
      filters: { ...DEFAULT_FILTERS },
      isLoading: false,
      lastError: null,
      currentDetail: null,
      stats: null,

      // ── Data ──
      setEntries: (entries, pagination) =>
        set({ entries, pagination }, false, "deletedAccount/setEntries"),

      setCurrentDetail: (currentDetail) =>
        set({ currentDetail }, false, "deletedAccount/setCurrentDetail"),

      setStats: (stats) => set({ stats }, false, "deletedAccount/setStats"),

      removeEntry: (entryId) =>
        set(
          (state) => ({
            entries: state.entries.filter((e) => e.id !== entryId),
            pagination: {
              ...state.pagination,
              total: state.pagination.total - 1,
            },
          }),
          false,
          "deletedAccount/removeEntry"
        ),

      markRestored: (entryId, restoredBy, note) =>
        set(
          (state) => ({
            entries: state.entries.map((e) =>
              e.id === entryId
                ? {
                    ...e,
                    restoredAt: new Date(),
                    restoredBy,
                    restoreNote: note,
                  }
                : e
            ),
          }),
          false,
          "deletedAccount/markRestored"
        ),

      // ── UI ──
      setFilter: (key, value) =>
        set(
          (state) => ({
            filters: {
              ...state.filters,
              [key]: value,
              ...(key !== "page" && key !== "pageSize" ? { page: 1 } : {}),
            },
          }),
          false,
          `deletedAccount/setFilter/${key}`
        ),

      resetFilters: () =>
        set(
          { filters: { ...DEFAULT_FILTERS } },
          false,
          "deletedAccount/resetFilters"
        ),

      setPage: (page) =>
        set(
          (state) => ({
            filters: { ...state.filters, page: Math.max(1, page) },
          }),
          false,
          "deletedAccount/setPage"
        ),

      setPageSize: (size) =>
        set(
          (state) => ({
            filters: { ...state.filters, pageSize: size, page: 1 },
          }),
          false,
          "deletedAccount/setPageSize"
        ),

      setLoading: (isLoading) =>
        set({ isLoading }, false, "deletedAccount/setLoading"),
      setError: (lastError) =>
        set({ lastError }, false, "deletedAccount/setError"),

      // ── Computed ──
      getFilteredEntries: () => {
        const { entries, filters } = get();
        let result = [...entries];

        if (filters.search.trim()) {
          const q = filters.search.toLowerCase();
          result = result.filter(
            (e) =>
              e.userEmail.toLowerCase().includes(q) ||
              (e.userName?.toLowerCase() || "").includes(q) ||
              e.reason.toLowerCase().includes(q) ||
              e.deletedByRole.toLowerCase().includes(q)
          );
        }

        result.sort((a, b) => {
          const order = filters.sortOrder === "asc" ? 1 : -1;
          switch (filters.sortBy) {
            case "userEmail":
              return a.userEmail.localeCompare(b.userEmail) * order;
            case "deletedBy":
              return a.deletedByRole.localeCompare(b.deletedByRole) * order;
            case "createdAt":
            default:
              return (
                (new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime()) *
                order
              );
          }
        });

        return result;
      },

      getActiveFiltersCount: () => {
        const { filters } = get();
        let count = 0;
        if (filters.search.trim()) count++;
        return count;
      },
    }),
    { name: "AdminDeletedAccountStore" }
  )
);
