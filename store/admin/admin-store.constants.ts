// store/admin/admin-store.constants.ts
// ============================================
// ADMIN STORE CONSTANTS — Valeurs par défaut et configurations
// ============================================

import type {
  UserFiltersState,
  AccountFiltersState,
  DeletedAccountFiltersState,
  PaginationInfo,
  AdminSnapshots,
  AdminStoreState,
  StatusFilter,
} from "./admin-store.types";

// ─── Default Filters ───────────────────────

export const DEFAULT_USER_FILTERS: UserFiltersState = {
  search: "",
  roleFilter: "ALL",
  statusFilter: "ALL",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  pageSize: 25,
};

export const DEFAULT_FILTERS = DEFAULT_USER_FILTERS; // Alias de compatibilité

export const DEFAULT_ACCOUNT_FILTERS: AccountFiltersState = {
  search: "",
  provider: "ALL",
  type: "ALL",
  sortBy: "provider",
  sortOrder: "asc",
  page: 1,
  pageSize: 25,
};

export const DEFAULT_DELETED_FILTERS: DeletedAccountFiltersState = {
  search: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  pageSize: 25,
};

// ─── Default Pagination ────────────────────

export const DEFAULT_PAGINATION: PaginationInfo = {
  total: 0,
  page: 1,
  pageSize: 25,
  totalPages: 1,
};

export const PAGE_SIZE_OPTIONS: readonly number[] = [10, 25, 50, 100] as const;

// ─── Options pour Selects UI ───────────────

export const USER_STATUS_OPTIONS: readonly { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Tous les statuts" },
  { value: "ACTIVE", label: "Actif" },
  { value: "PENDING", label: "En attente" },
  { value: "BLOCKED", label: "Bloqué" },
] as const;

// ─── Snapshots ─────────────────────────────

export const DEFAULT_SNAPSHOTS: AdminSnapshots = {
  users: null,
  blockedUsers: null,
  accounts: null,
  deletedEntries: null,
};

// ─── Initial Store State ───────────────────

export const INITIAL_ADMIN_STATE: AdminStoreState = {
  // Users slice
  users: [],
  blockedUsers: [],
  userFilters: { ...DEFAULT_USER_FILTERS },

  // Accounts slice
  accounts: [],
  accountPagination: { ...DEFAULT_PAGINATION },
  accountFilters: { ...DEFAULT_ACCOUNT_FILTERS },
  currentAccountDetail: null,

  // Deleted accounts slice
  deletedEntries: [],
  deletedPagination: { ...DEFAULT_PAGINATION },
  deletedFilters: { ...DEFAULT_DELETED_FILTERS },
  currentDeletedDetail: null,
  stats: null,

  // UI slice
  isLoading: false,
  lastError: null,
  _snapshot: null,
  _snapshots: { ...DEFAULT_SNAPSHOTS },
  _pendingOperations: {},
};
