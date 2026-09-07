"use client";

import { useCallback, useEffect } from "react";
import { listUsersAction } from "@/server/actions/admin/users/list-users";
import { useAdminUsersStore } from "@/store/admin/users/admin-users-store";

export function useAdminUsers() {
  const state = useAdminUsersStore();
  const load = useCallback(async (page = state.pagination.page) => {
    state.setLoading(true);
    try {
      const result = await listUsersAction({ page, pageSize: state.pagination.pageSize, search: state.search, status: state.status, role: state.role, blocked: state.blocked, sortBy: state.sortBy, sortDirection: state.sortDirection });
      state.setItems(result.items, result.pagination);
    } finally {
      state.setLoading(false);
    }
  }, [state]);

  useEffect(() => { void load(1); }, [state.search, state.status, state.role, state.blocked, state.sortBy, state.sortDirection]);
  return { ...state, reload: load };
}
