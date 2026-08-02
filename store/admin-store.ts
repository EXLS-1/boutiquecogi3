// stores/admin-store.ts
// ============================================
// ADMIN STORE — État centralisé unifié (Users + BlockedUsers)
// ============================================
// Zustand + computed getters pour filtres, tri et pagination.
// Gère l'optimistic locking via le champ `version` sur chaque entité.

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Role } from "@/lib/auth/rbac-shared";

// ─── Types ─────────────────────────────────

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  roleLevel: number;
  emailVerified: boolean | null;
  image: string | null;
  isBlocked: boolean;
  blockedAt?: Date | string | null;
  blockedUntil?: Date | string | null;
  blockedReason?: string | null;
  isPermanent?: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
  /** Champ de versionnage pour optimistic locking côté serveur */
  version: number;
  /** Flag interne : indique un état pending (optimistic) */
  _optimistic?: boolean;
}

export interface BlockedUser {
  assignmentId: string;
  userId: string;
  email: string | null;
  name: string | null;
  role: string;
  roleLevel: number;
  blockedAt: Date | string | null;
  blockedUntil: Date | string | null;
  blockedReason: string | null;
  isPermanent: boolean;
  version: number;
}

export type StatusFilter = "ALL" | "ACTIVE" | "BLOCKED" | "PENDING";
export type SortField = "createdAt" | "name" | "email" | "role";
export type SortOrder = "asc" | "desc";

export interface FilterState {
  search: string;
  roleFilter: Role | "ALL";
  statusFilter: StatusFilter;
  sortBy: SortField;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
}

interface AdminStore {
  // ── Data ──
  users: AdminUser[];
  blockedUsers: BlockedUser[];
  filters: FilterState;
  isLoading: boolean;
  lastError: string | null;
  /** Snapshot pour rollback atomic */
  _snapshot: AdminUser[] | null;

  // ── Actions data ──
  setUsers: (users: AdminUser[]) => void;
  setBlockedUsers: (users: BlockedUser[]) => void;
  updateUser: (userId: string, updates: Partial<AdminUser>) => void;
  updateUserRole: (userId: string, role: Role, level: number) => void;
  blockUserOptimistic: (userId: string, patch: Partial<AdminUser>) => void;
  unblockUserOptimistic: (userId: string) => void;
  removeUser: (userId: string) => void;
  saveSnapshot: () => void;
  restoreSnapshot: () => void;
  clearSnapshot: () => void;

  // ── Actions UI ──
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  nextPage: () => void;
  prevPage: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // ── Computed (getters) ──
  getFilteredUsers: () => AdminUser[];
  getFilteredBlockedUsers: () => BlockedUser[];
  getPaginatedUsers: () => AdminUser[];
  getPaginatedBlockedUsers: () => BlockedUser[];
  getTotalPages: () => number;
  getTotalBlockedPages: () => number;
  getActiveFiltersCount: () => number;
}

// ─── Constants ─────────────────────────────

const DEFAULT_FILTERS: FilterState = {
  search: "",
  roleFilter: "ALL",
  statusFilter: "ALL",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  pageSize: 25,
};

// ─── Store ─────────────────────────────────

export const useAdminStore = create<AdminStore>()(
  devtools(
    (set, get) => ({
      users: [],
      blockedUsers: [],
      filters: { ...DEFAULT_FILTERS },
      isLoading: false,
      lastError: null,
      _snapshot: null,

      // ── Data ──
      setUsers: (users) => set({ users }, false, "admin/setUsers"),
      setBlockedUsers: (blockedUsers) =>
        set({ blockedUsers }, false, "admin/setBlockedUsers"),

      updateUser: (userId, updates) =>
        set(
          (state) => ({
            users: state.users.map((u) =>
              u.id === userId ? { ...u, ...updates } : u
            ),
          }),
          false,
          "admin/updateUser"
        ),

      updateUserRole: (userId, role, level) =>
        set(
          (state) => ({
            users: state.users.map((u) =>
              u.id === userId
                ? { ...u, role, roleLevel: level, _optimistic: true }
                : u
            ),
          }),
          false,
          "admin/updateUserRole"
        ),

      blockUserOptimistic: (userId, patch) =>
        set(
          (state) => ({
            users: state.users.map((u) =>
              u.id === userId
                ? { ...u, isBlocked: true, ...patch, _optimistic: true }
                : u
            ),
          }),
          false,
          "admin/blockUserOptimistic"
        ),

      unblockUserOptimistic: (userId) =>
        set(
          (state) => ({
            users: state.users.map((u) =>
              u.id === userId
                ? {
                    ...u,
                    isBlocked: false,
                    blockedUntil: null,
                    blockedAt: null,
                    blockedReason: null,
                    isPermanent: false,
                    _optimistic: true,
                  }
                : u
            ),
          }),
          false,
          "admin/unblockUserOptimistic"
        ),

      removeUser: (userId) =>
        set(
          (state) => ({
            users: state.users.filter((u) => u.id !== userId),
          }),
          false,
          "admin/removeUser"
        ),

      saveSnapshot: () =>
        set(
          (state) => ({ _snapshot: state.users.map((u) => ({ ...u })) }),
          false,
          "admin/saveSnapshot"
        ),

      restoreSnapshot: () =>
        set(
          (state) => ({
            users: state._snapshot ? state._snapshot.map((u) => ({ ...u })) : state.users,
            _snapshot: null,
          }),
          false,
          "admin/restoreSnapshot"
        ),

      clearSnapshot: () => set({ _snapshot: null }, false, "admin/clearSnapshot"),

      // ── UI ──
      setFilter: (key, value) =>
        set(
          (state) => ({
            filters: {
              ...state.filters,
              [key]: value,
              // Reset page quand on change un filtre (sauf pageSize)
              ...(key !== "page" && key !== "pageSize" ? { page: 1 } : {}),
            },
          }),
          false,
          `admin/setFilter/${key}`
        ),

      resetFilters: () =>
        set({ filters: { ...DEFAULT_FILTERS } }, false, "admin/resetFilters"),

      nextPage: () => {
        const total = get().getTotalPages();
        set(
          (state) => ({
            filters: {
              ...state.filters,
              page: Math.min(state.filters.page + 1, total),
            },
          }),
          false,
          "admin/nextPage"
        );
      },

      prevPage: () =>
        set(
          (state) => ({
            filters: {
              ...state.filters,
              page: Math.max(state.filters.page - 1, 1),
            },
          }),
          false,
          "admin/prevPage"
        ),

      setPage: (page) =>
        set(
          (state) => ({
            filters: {
              ...state.filters,
              page: Math.max(1, page),
            },
          }),
          false,
          "admin/setPage"
        ),

      setPageSize: (size) =>
        set(
          (state) => ({
            filters: { ...state.filters, pageSize: size, page: 1 },
          }),
          false,
          "admin/setPageSize"
        ),

      setLoading: (isLoading) => set({ isLoading }, false, "admin/setLoading"),
      setError: (lastError) => set({ lastError }, false, "admin/setError"),

      // ── Computed ──
      getFilteredUsers: () => {
        const { users, filters } = get();
        let result = [...users];

        // Recherche texte
        if (filters.search.trim()) {
          const q = filters.search.toLowerCase();
          result = result.filter(
            (u) =>
              u.name?.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q) ||
              u.role.toLowerCase().includes(q)
          );
        }

        // Filtre rôle
        if (filters.roleFilter !== "ALL") {
          result = result.filter((u) => u.role === filters.roleFilter);
        }

        // Filtre statut
        if (filters.statusFilter !== "ALL") {
          result = result.filter((u) => {
            if (filters.statusFilter === "BLOCKED") return u.isBlocked;
            if (filters.statusFilter === "ACTIVE")
              return !u.isBlocked && u.emailVerified;
            if (filters.statusFilter === "PENDING")
              return !u.isBlocked && !u.emailVerified;
            return true;
          });
        }

        // Tri
        result.sort((a, b) => {
          const order = filters.sortOrder === "asc" ? 1 : -1;
          switch (filters.sortBy) {
            case "name":
              return ((a.name ?? "").localeCompare(b.name ?? "")) * order;
            case "email":
              return a.email.localeCompare(b.email) * order;
            case "role":
              return (a.roleLevel - b.roleLevel) * order;
            case "createdAt":
            default:
              return (
                (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
                order
              );
          }
        });

        return result;
      },

      getFilteredBlockedUsers: () => {
        const { blockedUsers, filters } = get();
        let result = [...blockedUsers];

        if (filters.search.trim()) {
          const q = filters.search.toLowerCase();
          result = result.filter(
            (u) =>
              u.name?.toLowerCase().includes(q) ||
              u.email?.toLowerCase().includes(q)
          );
        }

        result.sort((a, b) => {
          const order = filters.sortOrder === "asc" ? 1 : -1;
          if (filters.sortBy === "name") {
            return ((a.name ?? "").localeCompare(b.name ?? "")) * order;
          }
          return (
            (new Date(a.blockedAt ?? 0).getTime() -
              new Date(b.blockedAt ?? 0).getTime()) *
            order
          );
        });

        return result;
      },

      getPaginatedUsers: () => {
        const filtered = get().getFilteredUsers();
        const { page, pageSize } = get().filters;
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
      },

      getPaginatedBlockedUsers: () => {
        const filtered = get().getFilteredBlockedUsers();
        const { page, pageSize } = get().filters;
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
      },

      getTotalPages: () => {
        const filtered = get().getFilteredUsers();
        return Math.max(1, Math.ceil(filtered.length / get().filters.pageSize));
      },

      getTotalBlockedPages: () => {
        const filtered = get().getFilteredBlockedUsers();
        return Math.max(1, Math.ceil(filtered.length / get().filters.pageSize));
      },

      getActiveFiltersCount: () => {
        const { filters } = get();
        let count = 0;
        if (filters.search.trim()) count++;
        if (filters.roleFilter !== "ALL") count++;
        if (filters.statusFilter !== "ALL") count++;
        return count;
      },
    }),
    { name: "AdminStore" }
  )
);
