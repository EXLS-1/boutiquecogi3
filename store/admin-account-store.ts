// store/admin-account-store.ts
// ============================================
// ADMIN ACCOUNT STORE — État centralisé pour la gestion des comptes
// ============================================
// Zustand + computed getters pour filtres, tri et pagination.

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─── Types ─────────────────────────────────

export interface AccountItem {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  expiresAt: number | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

export interface AccountDetail extends AccountItem {
  password: string | null;
  refreshToken: string | null;
  accessToken: string | null;
  tokenType: string | null;
  scope: string | null;
  idToken: string | null;
  sessionState: string | null;
}

export interface AccountFiltersState {
  search: string;
  provider: string;
  type: string;
  sortBy: string;
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

interface AdminAccountStore {
  // ── Data ──
  accounts: AccountItem[];
  pagination: PaginationInfo;
  filters: AccountFiltersState;
  isLoading: boolean;
  lastError: string | null;
  currentDetail: AccountDetail | null;

  // ── Actions data ──
  setAccounts: (accounts: AccountItem[], pagination: PaginationInfo) => void;
  setCurrentDetail: (detail: AccountDetail | null) => void;
  removeAccount: (accountId: string) => void;

  // ── Actions UI ──
  setFilter: <K extends keyof AccountFiltersState>(
    key: K,
    value: AccountFiltersState[K]
  ) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // ── Computed ──
  getFilteredAccounts: () => AccountItem[];
  getActiveFiltersCount: () => number;
}

// ─── Constants ─────────────────────────────

const DEFAULT_FILTERS: AccountFiltersState = {
  search: "",
  provider: "ALL",
  type: "ALL",
  sortBy: "provider",
  sortOrder: "asc",
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

export const useAdminAccountStore = create<AdminAccountStore>()(
  devtools(
    (set, get) => ({
      accounts: [],
      pagination: { ...DEFAULT_PAGINATION },
      filters: { ...DEFAULT_FILTERS },
      isLoading: false,
      lastError: null,
      currentDetail: null,

      // ── Data ──
      setAccounts: (accounts, pagination) =>
        set({ accounts, pagination }, false, "account/setAccounts"),

      setCurrentDetail: (currentDetail) =>
        set({ currentDetail }, false, "account/setCurrentDetail"),

      removeAccount: (accountId) =>
        set(
          (state) => ({
            accounts: state.accounts.filter((a) => a.id !== accountId),
            pagination: {
              ...state.pagination,
              total: state.pagination.total - 1,
            },
          }),
          false,
          "account/removeAccount"
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
          `account/setFilter/${key}`
        ),

      resetFilters: () =>
        set({ filters: { ...DEFAULT_FILTERS } }, false, "account/resetFilters"),

      setPage: (page) =>
        set(
          (state) => ({
            filters: { ...state.filters, page: Math.max(1, page) },
          }),
          false,
          "account/setPage"
        ),

      setPageSize: (size) =>
        set(
          (state) => ({
            filters: { ...state.filters, pageSize: size, page: 1 },
          }),
          false,
          "account/setPageSize"
        ),

      setLoading: (isLoading) =>
        set({ isLoading }, false, "account/setLoading"),
      setError: (lastError) => set({ lastError }, false, "account/setError"),

      // ── Computed ──
      getFilteredAccounts: () => {
        const { accounts, filters } = get();
        let result = [...accounts];

        if (filters.search.trim()) {
          const q = filters.search.toLowerCase();
          result = result.filter(
            (a) =>
              a.provider.toLowerCase().includes(q) ||
              a.providerAccountId.toLowerCase().includes(q) ||
              a.type.toLowerCase().includes(q) ||
              a.user?.email?.toLowerCase().includes(q) ||
              a.user?.name?.toLowerCase().includes(q)
          );
        }

        if (filters.provider !== "ALL") {
          result = result.filter((a) => a.provider === filters.provider);
        }

        if (filters.type !== "ALL") {
          result = result.filter((a) => a.type === filters.type);
        }

        result.sort((a, b) => {
          const order = filters.sortOrder === "asc" ? 1 : -1;
          switch (filters.sortBy) {
            case "provider":
              return a.provider.localeCompare(b.provider) * order;
            case "type":
              return a.type.localeCompare(b.type) * order;
            case "userEmail":
              return (
                (a.user?.email ?? "").localeCompare(b.user?.email ?? "") * order
              );
            default:
              return a.provider.localeCompare(b.provider) * order;
          }
        });

        return result;
      },

      getActiveFiltersCount: () => {
        const { filters } = get();
        let count = 0;
        if (filters.search.trim()) count++;
        if (filters.provider !== "ALL") count++;
        if (filters.type !== "ALL") count++;
        return count;
      },
    }),
    { name: "AdminAccountStore" }
  )
);
