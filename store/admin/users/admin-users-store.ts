"use client";

import { create } from "zustand";
import type { Role } from "@prisma/client";
import type { UserListItem, UsersPagination } from "@/lib/admin/users/users.types";
import type { UserSortDirection, UserSortField, UserStatus } from "@/lib/admin/users/users.constants";

interface UsersState {
  items: UserListItem[];
  pagination: UsersPagination;
  search: string;
  status?: UserStatus;
  role?: Role;
  blocked?: boolean;
  sortBy: UserSortField;
  sortDirection: UserSortDirection;
  isLoading: boolean;
  setItems: (items: UserListItem[], pagination: UsersPagination) => void;
  setFilters: (filters: Partial<Pick<UsersState, "search" | "status" | "role" | "blocked" | "sortBy" | "sortDirection">>) => void;
  setLoading: (value: boolean) => void;
  patchItem: (id: string, patch: Partial<UserListItem>) => void;
}

export const useAdminUsersStore = create<UsersState>((set) => ({
  items: [],
  pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
  search: "",
  sortBy: "createdAt",
  sortDirection: "desc",
  isLoading: false,
  setItems: (items, pagination) => set({ items, pagination }),
  setFilters: (filters) => set(filters),
  setLoading: (isLoading) => set({ isLoading }),
  patchItem: (id, patch) => set((state) => ({ items: state.items.map((item) => item.id === id ? { ...item, ...patch } : item) })),
}));
