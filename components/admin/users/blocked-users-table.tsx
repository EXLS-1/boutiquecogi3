"use client";

import { useEffect } from "react";
import { UsersTable } from "./users-table";
import { useAdminUsersStore } from "@/store/admin/users/admin-users-store";

export function BlockedUsersTable() {
  const setFilters = useAdminUsersStore((state) => state.setFilters);
  useEffect(() => { setFilters({ blocked: true }); return () => setFilters({ blocked: undefined }); }, [setFilters]);
  return <UsersTable />;
}
