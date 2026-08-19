// store/admin/admin-store.types.ts
// ============================================
// ADMIN STORE TYPES — Typage complet & renforcé
// ============================================

import type { Role } from "@/lib/auth/rbac-shared";

// ─── Optimistic & Versioning Control ───────

export interface VersionedEntity {
  /** Numéro de version pour optimistic concurrency control (OCC) */
  version: number;
  /** Drapeau indiquant un état optimiste (en attente de confirmation serveur) */
  _optimistic?: boolean;
  /** Nom de l'opération optimiste en cours */
  _pendingAction?: string;
  /** Horodatage de l'application optimiste */
  _optimisticAt?: number;
}

// ─── Domain: Users & Blocked Users ─────────

export interface AdminUser extends VersionedEntity {
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
}

export interface BlockedUser extends VersionedEntity {
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
}

export type StatusFilter = "ALL" | "ACTIVE" | "BLOCKED" | "PENDING";
export type UserSortField = "createdAt" | "name" | "email" | "role";
export type SortField = UserSortField; // Alias de compatibilité
export type SortOrder = "asc" | "desc";

export interface UserFiltersState {
  search: string;
  roleFilter: Role | "ALL";
  statusFilter: StatusFilter;
  sortBy: UserSortField;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
}

export type FilterState = UserFiltersState; // Alias de compatibilité

// ─── Domain: Linked Accounts ───────────────

export interface AccountUserSummary {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface AccountItem extends VersionedEntity {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  expiresAt: number | null;
  user: AccountUserSummary | null;
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

export type AccountSortField = "provider" | "type" | "userEmail" | "expiresAt" | "createdAt";

export interface AccountFiltersState {
  search: string;
  provider: string;
  type: string;
  sortBy: AccountSortField | string;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
}

// ─── Domain: Deleted Accounts Registry ─────

export interface DeletedAccountItem extends VersionedEntity {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  deletedBy: string;
  deletedByRole: string;
  reason: string;
  createdAt: Date | string;
  restoredAt: Date | string | null;
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

export type DeletedAccountSortField = "createdAt" | "userEmail" | "deletedBy" | "userName";

export interface DeletedAccountFiltersState {
  search: string;
  sortBy: DeletedAccountSortField | string;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
}

// ─── Pagination ────────────────────────────

export interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Snapshot & Optimistic Rollback ────────

export type OptimisticDomain = "users" | "blockedUsers" | "accounts" | "deletedEntries";

export interface AdminSnapshots {
  users: AdminUser[] | null;
  blockedUsers: BlockedUser[] | null;
  accounts: AccountItem[] | null;
  deletedEntries: DeletedAccountItem[] | null;
}

export interface OptimisticActionOptions {
  domain?: OptimisticDomain;
  actionName?: string;
  expectedVersion?: number;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

// ─── Store Slices Interfaces ───────────────

export interface UsersSliceState {
  users: AdminUser[];
  blockedUsers: BlockedUser[];
  userFilters: UserFiltersState;
}

export interface UsersSliceActions {
  setUsers: (users: AdminUser[]) => void;
  setBlockedUsers: (blockedUsers: BlockedUser[]) => void;
  updateUser: (userId: string, updates: Partial<AdminUser>, expectedVersion?: number) => void;
  updateUserRole: (userId: string, role: Role, level: number) => void;
  blockUserOptimistic: (userId: string, patch: Partial<AdminUser>) => void;
  unblockUserOptimistic: (userId: string) => void;
  removeUser: (userId: string) => void;
  reconcileUser: (user: AdminUser) => void;
  setFilter: <K extends keyof UserFiltersState>(key: K, value: UserFiltersState[K]) => void;
  resetFilters: () => void;
  nextPage: () => void;
  prevPage: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Filters & Pagination
  setUserFilter: <K extends keyof UserFiltersState>(key: K, value: UserFiltersState[K]) => void;
  resetUserFilters: () => void;
  nextUserPage: () => void;
  prevUserPage: () => void;
  setUserPage: (page: number) => void;
  setUserPageSize: (size: number) => void;
}

export interface AccountsSliceState {
  accounts: AccountItem[];
  accountPagination: PaginationInfo;
  accountFilters: AccountFiltersState;
  currentAccountDetail: AccountDetail | null;
}

export interface AccountsSliceActions {
  setAccounts: (accounts: AccountItem[], pagination?: PaginationInfo) => void;
  setCurrentAccountDetail: (detail: AccountDetail | null) => void;
  setCurrentDetail: (detail: AccountDetail | null) => void;
  removeAccount: (accountId: string) => void;
  removeAccountOptimistic: (accountId: string) => void;

  // Filters & Pagination
  setAccountFilter: <K extends keyof AccountFiltersState>(key: K, value: AccountFiltersState[K]) => void;
  resetAccountFilters: () => void;
  setAccountPage: (page: number) => void;
  setAccountPageSize: (size: number) => void;
}

export interface DeletedAccountsSliceState {
  deletedEntries: DeletedAccountItem[];
  deletedPagination: PaginationInfo;
  deletedFilters: DeletedAccountFiltersState;
  currentDeletedDetail: DeletedAccountDetail | null;
  stats: RegistryStats | null;
}

export interface DeletedAccountsSliceActions {
  setDeletedEntries: (entries: DeletedAccountItem[], pagination?: PaginationInfo) => void;
  setEntries: (entries: DeletedAccountItem[], pagination?: PaginationInfo) => void;
  setCurrentDeletedDetail: (detail: DeletedAccountDetail | null) => void;
  setStats: (stats: RegistryStats | null) => void;
  removeDeletedEntry: (entryId: string) => void;
    removeEntry: (entryId: string) => void;
  markRestored: (entryId: string, restoredBy: string, note: string | null) => void;
  markRestoredOptimistic: (entryId: string, restoredBy: string, note: string | null) => void;

  // Filters & Pagination
  setDeletedFilter: <K extends keyof DeletedAccountFiltersState>(key: K, value: DeletedAccountFiltersState[K]) => void;
  resetDeletedFilters: () => void;
  setDeletedPage: (page: number) => void;
  setDeletedPageSize: (size: number) => void;
}

export interface UISliceState {
  isLoading: boolean;
  lastError: string | null;
  _snapshot: AdminUser[] | null; // Compatibility alias
  _snapshots: AdminSnapshots;
  _pendingOperations: Record<string, boolean>;
}

export interface UISliceActions {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Snapshot & Rollback
  saveSnapshot: (domain?: OptimisticDomain | "all") => void;
  restoreSnapshot: (domain?: OptimisticDomain | "all") => void;
  clearSnapshot: (domain?: OptimisticDomain | "all") => void;

  // Rollback async wrapper
  executeOptimistic: <T>(
    operationName: string,
    optimisticMutate: () => void,
    serverAction: (expectedVersion?: number) => Promise<T>,
    domain?: OptimisticDomain,
    expectedVersion?: number
  ) => Promise<T>;
}

export interface ComputedGetters {
  // Users
  getFilteredUsers: () => AdminUser[];
  getFilteredBlockedUsers: () => BlockedUser[];
  getPaginatedUsers: () => AdminUser[];
  getPaginatedBlockedUsers: () => BlockedUser[];
  getTotalPages: () => number;
  getTotalBlockedPages: () => number;
  getActiveFiltersCount: () => number;
  getActiveUserFiltersCount: () => number;

  // Accounts
  getFilteredAccounts: () => AccountItem[];
  getPaginatedAccounts: () => AccountItem[];
  getAccountTotalPages: () => number;
  getActiveAccountFiltersCount: () => number;

  // Deleted Accounts
  getFilteredDeletedEntries: () => DeletedAccountItem[];
    getFilteredEntries: () => DeletedAccountItem[];
  getPaginatedDeletedEntries: () => DeletedAccountItem[];
  getDeletedTotalPages: () => number;
  getActiveDeletedFiltersCount: () => number;
}

// ─── Combined Admin Store Type ─────────────

export type AdminStoreState = UsersSliceState &
  AccountsSliceState &
  DeletedAccountsSliceState &
  UISliceState;

export type AdminStoreActions = UsersSliceActions &
  AccountsSliceActions &
  DeletedAccountsSliceActions &
  UISliceActions &
  ComputedGetters;

export type AdminStore = AdminStoreState & AdminStoreActions;
