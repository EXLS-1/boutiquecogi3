// store/admin/admin-store.ts
// ============================================
// ADMIN STORE — Store centralisé unifié (Users, Blocked, Accounts, Deleted Registry)
// ============================================
// Fusion robuste avec typage strict, rollback optimiste,
// gestion de versions (OCC), pagination & sélecteurs Zustand.

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Role } from "@/lib/auth/rbac-shared";
import type {
  AdminStore,
  AdminUser,
  BlockedUser,
  AccountItem,
  AccountDetail,
  DeletedAccountItem,
  DeletedAccountDetail,
  RegistryStats,
  UserFiltersState,
  AccountFiltersState,
  DeletedAccountFiltersState,
  PaginationInfo,
  OptimisticDomain,
} from "./admin-store.types";
import {
  DEFAULT_USER_FILTERS,
  DEFAULT_ACCOUNT_FILTERS,
  DEFAULT_DELETED_FILTERS,
  DEFAULT_PAGINATION,
  DEFAULT_SNAPSHOTS,
  INITIAL_ADMIN_STATE,
} from "./admin-store.constants";
import {
  filterAndSortUsers,
  filterAndSortBlockedUsers,
  filterAndSortAccounts,
  filterAndSortDeletedAccounts,
  paginateList,
  calculateTotalPages,
  countActiveUserFilters,
  countActiveAccountFilters,
  countActiveDeletedFilters,
  cloneSnapshot,
  applyOptimisticPatch,
  reconcileEntity,
} from "./admin-store.utils";

const optimisticDomainQueues = new Map<OptimisticDomain, Promise<void>>();

// ─── Store Instance ────────────────────────

export const useAdminStore = create<AdminStore>()(
  devtools(
    (set, get) => ({
      ...INITIAL_ADMIN_STATE,

      // ═══════════════════════════════════════
      // USERS SLICE ACTIONS
      // ═══════════════════════════════════════

      setUsers: (users) =>
        set(
          (state) => ({
            users,
            userFilters: {
              ...state.userFilters,
              page: Math.min(
                state.userFilters.page,
                calculateTotalPages(users.length, state.userFilters.pageSize)
              ),
            },
          }),
          false,
          "admin/setUsers"
        ),

      setBlockedUsers: (blockedUsers) =>
        set({ blockedUsers }, false, "admin/setBlockedUsers"),

      updateUser: (userId, updates) =>
        set(
          (state) => ({
            users: state.users.map((u) =>
              u.id === userId
                ? {
                    ...u,
                    ...updates,
                  }
                : u
            ),
          }),
          false,
          "admin/updateUser"
        ),

      updateUserRole: (userId, role, level) =>
        set(
          (state) => ({
            users: applyOptimisticPatch(
              state.users,
              userId,
              { role, roleLevel: level },
              "updateUserRole"
            ),
          }),
          false,
          "admin/updateUserRole"
        ),

      blockUserOptimistic: (userId, patch) =>
        set(
          (state) => ({
            users: applyOptimisticPatch(
              state.users,
              userId,
              { isBlocked: true, ...patch },
              "blockUser"
            ),
          }),
          false,
          "admin/blockUserOptimistic"
        ),

      unblockUserOptimistic: (userId) =>
        set(
          (state) => ({
            users: applyOptimisticPatch(
              state.users,
              userId,
              {
                isBlocked: false,
                blockedUntil: null,
                blockedAt: null,
                blockedReason: null,
                isPermanent: false,
              },
              "unblockUser"
            ),
            blockedUsers: state.blockedUsers.filter((b) => b.userId !== userId),
          }),
          false,
          "admin/unblockUserOptimistic"
        ),

      removeUser: (userId) =>
        set(
          (state) => ({
            users: state.users.filter((u) => u.id !== userId),
            blockedUsers: state.blockedUsers.filter((b) => b.userId !== userId),
          }),
          false,
          "admin/removeUser"
        ),

      reconcileUser: (serverUser) =>
        set(
          (state) => ({
            users: reconcileEntity(state.users, serverUser),
          }),
          false,
          "admin/reconcileUser"
        ),

      // Users Filters & Pagination
      setUserFilter: (key, value) =>
          setFilter: (key, value) => get().setUserFilter(key, value),
        set(
          (state) => {
            const nextFilters = {
              ...state.userFilters,
              [key]: value,
              ...(key !== "page" && key !== "pageSize" ? { page: 1 } : {}),
            };
            return {
              userFilters: nextFilters,
            };
          },
          false,
          `admin/setUserFilter/${key}`
        ),
      resetUserFilters: () =>
          resetFilters: () => get().resetUserFilters(),
        set(
          {
            userFilters: { ...DEFAULT_USER_FILTERS },
          },
          false,
          "admin/resetUserFilters"
        ),
      nextUserPage: () => {
          nextPage: () => get().nextUserPage(),
        const total = get().getTotalPages();
        set(
          (state) => {
            const nextFilters = {
              ...state.userFilters,
              page: Math.min(state.userFilters.page + 1, total),
            };
            return { userFilters: nextFilters };
          },
          false,
          "admin/nextUserPage"
        );
      },
      prevUserPage: () =>
          prevPage: () => get().prevUserPage(),
          setPage: (page) => get().setUserPage(page),
        set(
          (state) => {
            const nextFilters = {
              ...state.userFilters,
              page: Math.max(state.userFilters.page - 1, 1),
            };
            return { userFilters: nextFilters };
          },
          false,
          "admin/prevUserPage"
        ),

      setPage: (page) =>
        set(
          (state) => {
            const nextFilters = {
              ...state.userFilters,
              page: Math.max(1, page),
            };
            return { userFilters: nextFilters };
          },
          false,
          "admin/setUserPage"
        ),
      setUserPageSize: (size) =>
          setPageSize: (size) => get().setUserPageSize(size),
          setCurrentDetail: (detail) => get().setCurrentAccountDetail(detail),
          setEntries: (entries, pagination) => get().setDeletedEntries(entries, pagination),
          removeEntry: (entryId) => get().removeDeletedEntry(entryId),
        set(
          (state) => {
            const nextFilters = {
              ...state.userFilters,
              pageSize: size,
              page: 1,
            };
            return { userFilters: nextFilters };
          },
          false,
          "admin/setUserPageSize"
        ),

      // ═══════════════════════════════════════
      // ACCOUNTS SLICE ACTIONS
      // ═══════════════════════════════════════

      setAccounts: (accounts, pagination) =>
        set(
          (state) => ({
            accounts,
            accountPagination: pagination ?? {
              ...state.accountPagination,
              total: accounts.length,
              totalPages: calculateTotalPages(
                accounts.length,
                state.accountFilters.pageSize
              ),
            },
          }),
          false,
          "admin/setAccounts"
        ),

      setCurrentDetail: (detail) =>
        set(
          { currentAccountDetail: detail },
          false,
          "admin/setCurrentAccountDetail"
        ),


      removeAccount: (accountId) =>
        set(
          (state) => ({
            accounts: state.accounts.filter((a) => a.id !== accountId),
            accountPagination: {
              ...state.accountPagination,
              total: Math.max(0, state.accountPagination.total - 1),
              totalPages: calculateTotalPages(
                Math.max(0, state.accountPagination.total - 1),
                state.accountPagination.pageSize
              ),
            },
          }),
          false,
          "admin/removeAccount"
        ),

      removeAccountOptimistic: (accountId) => {
        get().saveSnapshot("accounts");
        get().removeAccount(accountId);
      },

      setAccountFilter: (key, value) =>
        set(
          (state) => ({
            accountFilters: {
              ...state.accountFilters,
              [key]: value,
              ...(key !== "page" && key !== "pageSize" ? { page: 1 } : {}),
            },
          }),
          false,
          `admin/setAccountFilter/${key}`
        ),

      resetAccountFilters: () =>
        set(
          { accountFilters: { ...DEFAULT_ACCOUNT_FILTERS } },
          false,
          "admin/resetAccountFilters"
        ),

      setAccountPage: (page) =>
        set(
          (state) => ({
            accountFilters: {
              ...state.accountFilters,
              page: Math.max(1, page),
            },
          }),
          false,
          "admin/setAccountPage"
        ),

      setAccountPageSize: (size) =>
        set(
          (state) => ({
            accountFilters: {
              ...state.accountFilters,
              pageSize: size,
              page: 1,
            },
          }),
          false,
          "admin/setAccountPageSize"
        ),

      // ═══════════════════════════════════════
      // DELETED ACCOUNTS SLICE ACTIONS
      // ═══════════════════════════════════════

      setEntries: (entries, pagination) =>
        set(
          (state) => ({
            deletedEntries: entries,
            deletedPagination: pagination ?? {
              ...state.deletedPagination,
              total: entries.length,
              totalPages: calculateTotalPages(
                entries.length,
                state.deletedFilters.pageSize
              ),
            },
          }),
          false,
          "admin/setDeletedEntries"
        ),


      setCurrentDeletedDetail: (detail) =>
        set({ currentDeletedDetail: detail }, false, "admin/setCurrentDeletedDetail"),

      setStats: (stats) => set({ stats }, false, "admin/setStats"),

      removeEntry: (entryId) =>
        set(
          (state) => {
            const nextEntries = state.deletedEntries.filter((e) => e.id !== entryId);
            const nextTotal = Math.max(0, state.deletedPagination.total - 1);
            return {
              deletedEntries: nextEntries,
              deletedPagination: {
                ...state.deletedPagination,
                total: nextTotal,
                totalPages: calculateTotalPages(
                  nextTotal,
                  state.deletedPagination.pageSize
                ),
              },
            };
          },
          false,
          "admin/removeDeletedEntry"
        ),


      markRestored: (entryId, restoredBy, note) =>
        set(
          (state) => {
            const updated = state.deletedEntries.map((e) =>
              e.id === entryId
                ? {
                    ...e,
                    restoredAt: new Date().toISOString(),
                    restoredBy,
                    restoreNote: note,
                  }
                : e
            );
            return {
              deletedEntries: updated,
            };
          },
          false,
          "admin/markRestored"
        ),

      markRestoredOptimistic: (entryId, restoredBy, note) => {
        get().saveSnapshot("deletedEntries");
        get().markRestored(entryId, restoredBy, note);
      },

      setDeletedFilter: (key, value) =>
        set(
          (state) => ({
            deletedFilters: {
              ...state.deletedFilters,
              [key]: value,
              ...(key !== "page" && key !== "pageSize" ? { page: 1 } : {}),
            },
          }),
          false,
          `admin/setDeletedFilter/${key}`
        ),

      resetDeletedFilters: () =>
        set(
          { deletedFilters: { ...DEFAULT_DELETED_FILTERS } },
          false,
          "admin/resetDeletedFilters"
        ),

      setDeletedPage: (page) =>
        set(
          (state) => ({
            deletedFilters: {
              ...state.deletedFilters,
              page: Math.max(1, page),
            },
          }),
          false,
          "admin/setDeletedPage"
        ),

      setDeletedPageSize: (size) =>
        set(
          (state) => ({
            deletedFilters: {
              ...state.deletedFilters,
              pageSize: size,
              page: 1,
            },
          }),
          false,
          "admin/setDeletedPageSize"
        ),

      // ═══════════════════════════════════════
      // UI & OPTIMISTIC SNAPSHOT ROLLBACK
      // ═══════════════════════════════════════

      setLoading: (isLoading) => set({ isLoading }, false, "admin/setLoading"),
      setError: (lastError) => set({ lastError }, false, "admin/setError"),
      clearError: () => set({ lastError: null }, false, "admin/clearError"),

      saveSnapshot: (domain = "all") =>
        set(
          (state) => {
            const nextSnapshots = { ...state._snapshots };
            if (domain === "users" || domain === "all") {
              nextSnapshots.users = cloneSnapshot(state.users);
            }
            if (domain === "blockedUsers" || domain === "all") {
              nextSnapshots.blockedUsers = cloneSnapshot(state.blockedUsers);
            }
            if (domain === "accounts" || domain === "all") {
              nextSnapshots.accounts = cloneSnapshot(state.accounts);
            }
            if (domain === "deletedEntries" || domain === "all") {
              nextSnapshots.deletedEntries = cloneSnapshot(state.deletedEntries);
            }

            return {
              _snapshots: nextSnapshots,
              _snapshot: nextSnapshots.users, // Alias de compatibilité
            };
          },
          false,
          `admin/saveSnapshot/${domain}`
        ),

      restoreSnapshot: (domain = "all") =>
        set(
          (state) => {
            const updates: Partial<AdminStore> = {};
            const snapshots = state._snapshots;

            if ((domain === "users" || domain === "all") && snapshots.users) {
              updates.users = cloneSnapshot(snapshots.users);
            }
            if (
              (domain === "blockedUsers" || domain === "all") &&
              snapshots.blockedUsers
            ) {
              updates.blockedUsers = cloneSnapshot(snapshots.blockedUsers);
            }
            if ((domain === "accounts" || domain === "all") && snapshots.accounts) {
              updates.accounts = cloneSnapshot(snapshots.accounts);
            }
            if (
              (domain === "deletedEntries" || domain === "all") &&
              snapshots.deletedEntries
            ) {
              const restoredEntries = cloneSnapshot(snapshots.deletedEntries);
              updates.deletedEntries = restoredEntries;
            }

            const nextSnapshots = { ...snapshots };
            if (domain === "all") {
              nextSnapshots.users = null;
              nextSnapshots.blockedUsers = null;
              nextSnapshots.accounts = null;
              nextSnapshots.deletedEntries = null;
            } else {
              nextSnapshots[domain] = null;
            }

            return {
              ...updates,
              _snapshots: nextSnapshots,
              _snapshot: nextSnapshots.users,
            };
          },
          false,
          `admin/restoreSnapshot/${domain}`
        ),

      clearSnapshot: (domain = "all") =>
        set(
          (state) => {
            const nextSnapshots = { ...state._snapshots };
            if (domain === "all") {
              nextSnapshots.users = null;
              nextSnapshots.blockedUsers = null;
              nextSnapshots.accounts = null;
              nextSnapshots.deletedEntries = null;
            } else {
              nextSnapshots[domain] = null;
            }
            return {
              _snapshots: nextSnapshots,
              _snapshot: nextSnapshots.users,
            };
          },
          false,
          `admin/clearSnapshot/${domain}`
        ),

      executeOptimistic: async <T>(
        operationName: string,
        optimisticMutate: () => void,
        serverAction: (expectedVersion?: number) => Promise<T>,
        domain: OptimisticDomain = "users",
        expectedVersion?: number
      ): Promise<T> => {
        const previous = optimisticDomainQueues.get(domain) ?? Promise.resolve();
        let release!: () => void;
        const lock = new Promise<void>((resolve) => {
          release = resolve;
        });
        const queued = previous.catch(() => undefined).then(() => lock);
        optimisticDomainQueues.set(domain, queued);
        await previous.catch(() => undefined);
        get().saveSnapshot(domain);
        set(
          (state) => ({
            _pendingOperations: {
              ...state._pendingOperations,
              [operationName]: true,
            },
          }),
          false,
          `admin/optimistic/start/${operationName}`
        );

        try {
          optimisticMutate();
          const result = await serverAction(expectedVersion);
          get().clearSnapshot(domain);
          return result;
        } catch (error) {
          get().restoreSnapshot(domain);
          const message =
            error instanceof Error ? error.message : "Une erreur est survenue";
          get().setError(message);
          throw error;
        } finally {
          set(
            (state) => {
              const nextPending = { ...state._pendingOperations };
              delete nextPending[operationName];
              return { _pendingOperations: nextPending };
            },
            false,
            `admin/optimistic/end/${operationName}`
          );
          release();
          if (optimisticDomainQueues.get(domain) === queued) {
            optimisticDomainQueues.delete(domain);
          }
        }
      },

      // ═══════════════════════════════════════
      // COMPUTED GETTERS
      // ═══════════════════════════════════════

      // Users
      getFilteredUsers: () => {
        const { users, userFilters } = get();
        return filterAndSortUsers(users, userFilters);
      },

      getFilteredBlockedUsers: () => {
        const { blockedUsers, userFilters } = get();
        return filterAndSortBlockedUsers(blockedUsers, userFilters);
      },

      getPaginatedUsers: () => {
        const filtered = get().getFilteredUsers();
        const { page, pageSize } = get().userFilters;
        return paginateList(filtered, page, pageSize);
      },

      getPaginatedBlockedUsers: () => {
        const filtered = get().getFilteredBlockedUsers();
        const { page, pageSize } = get().userFilters;
        return paginateList(filtered, page, pageSize);
      },

      getTotalPages: () => {
        const filtered = get().getFilteredUsers();
        return calculateTotalPages(filtered.length, get().userFilters.pageSize);
      },

      getTotalBlockedPages: () => {
        const filtered = get().getFilteredBlockedUsers();
        return calculateTotalPages(filtered.length, get().userFilters.pageSize);
      },

      getActiveFiltersCount: () => {
        return countActiveUserFilters(get().userFilters);
      },

      // Accounts
      getFilteredAccounts: () => {
        const { accounts, accountFilters } = get();
        return filterAndSortAccounts(accounts, accountFilters);
      },

      getPaginatedAccounts: () => {
        const filtered = get().getFilteredAccounts();
        const { page, pageSize } = get().accountFilters;
        return paginateList(filtered, page, pageSize);
      },

      getAccountTotalPages: () => {
        const filtered = get().getFilteredAccounts();
        return calculateTotalPages(filtered.length, get().accountFilters.pageSize);
      },

      getActiveAccountFiltersCount: () => {
        return countActiveAccountFilters(get().accountFilters);
      },

      // Deleted Accounts
      getFilteredDeletedEntries: () => {
          getFilteredEntries: () => get().getFilteredDeletedEntries(),
        const { deletedEntries, deletedFilters } = get();
        return filterAndSortDeletedAccounts(deletedEntries, deletedFilters);
      },

      getPaginatedDeletedEntries: () => {
        const filtered = get().getFilteredDeletedEntries();
        const { page, pageSize } = get().deletedFilters;
        return paginateList(filtered, page, pageSize);
      },

      getDeletedTotalPages: () => {
        const filtered = get().getFilteredDeletedEntries();
        return calculateTotalPages(filtered.length, get().deletedFilters.pageSize);
      },

      getActiveDeletedFiltersCount: () => {
        return countActiveDeletedFilters(get().deletedFilters);
      },
    }),
    { name: "UnifiedAdminStore" }
  )
);

// ═══════════════════════════════════════════
// ZUSTAND SELECTORS (Optimized fine-grained React hooks)
// ═══════════════════════════════════════════

// ── State Selectors ──
export const useUsers = () => useAdminStore((s) => s.users);
export const useBlockedUsers = () => useAdminStore((s) => s.blockedUsers);
export const useUserFilters = () => useAdminStore((s) => s.userFilters);
export const useAccounts = () => useAdminStore((s) => s.accounts);
export const useAccountFilters = () => useAdminStore((s) => s.accountFilters);
export const useAccountPagination = () => useAdminStore((s) => s.accountPagination);
export const useCurrentAccountDetail = () => useAdminStore((s) => s.currentAccountDetail);
export const useDeletedAccounts = () => useAdminStore((s) => s.deletedEntries);
export const useDeletedFilters = () => useAdminStore((s) => s.deletedFilters);
export const useDeletedPagination = () => useAdminStore((s) => s.deletedPagination);
export const useCurrentDeletedDetail = () => useAdminStore((s) => s.currentDeletedDetail);
export const useAdminStats = () => useAdminStore((s) => s.stats);
export const useAdminLoading = () => useAdminStore((s) => s.isLoading);
export const useAdminError = () => useAdminStore((s) => s.lastError);
export const useAdminSnapshots = () => useAdminStore((s) => s._snapshots);

// ── Action Selectors ──
export const useAdminActions = () => {
  return useAdminStore((s) => ({
    // Users
    setUsers: s.setUsers,
    setBlockedUsers: s.setBlockedUsers,
    updateUser: s.updateUser,
    updateUserRole: s.updateUserRole,
    blockUserOptimistic: s.blockUserOptimistic,
    unblockUserOptimistic: s.unblockUserOptimistic,
    removeUser: s.removeUser,
    reconcileUser: s.reconcileUser,
    setUserFilter: s.setUserFilter,
    resetUserFilters: s.resetUserFilters,
    nextUserPage: s.nextUserPage,
    prevUserPage: s.prevUserPage,
    setUserPage: s.setUserPage,
    setUserPageSize: s.setUserPageSize,

    // Accounts
    setAccounts: s.setAccounts,
    setCurrentAccountDetail: s.setCurrentAccountDetail,
    removeAccount: s.removeAccount,
    removeAccountOptimistic: s.removeAccountOptimistic,
    setAccountFilter: s.setAccountFilter,
    resetAccountFilters: s.resetAccountFilters,
    setAccountPage: s.setAccountPage,
    setAccountPageSize: s.setAccountPageSize,

    // Deleted
    setDeletedEntries: s.setDeletedEntries,
    setCurrentDeletedDetail: s.setCurrentDeletedDetail,
    setStats: s.setStats,
    removeDeletedEntry: s.removeDeletedEntry,
    markRestored: s.markRestored,
    markRestoredOptimistic: s.markRestoredOptimistic,
    setDeletedFilter: s.setDeletedFilter,
    resetDeletedFilters: s.resetDeletedFilters,
    setDeletedPage: s.setDeletedPage,
    setDeletedPageSize: s.setDeletedPageSize,

    // UI & Optimistic
    setLoading: s.setLoading,
    setError: s.setError,
    clearError: s.clearError,
    saveSnapshot: s.saveSnapshot,
    restoreSnapshot: s.restoreSnapshot,
    clearSnapshot: s.clearSnapshot,
    executeOptimistic: s.executeOptimistic,
  }));
};

// ═══════════════════════════════════════════
// COMPATIBILITY HOOKS
// ═══════════════════════════════════════════

/**
 * Hook de compatibilité pour le store des comptes liés
 */
export const useAdminAccountStore = useAdminStore;

/**
 * Hook de compatibilité pour le store du registre des comptes supprimés
 */
export const useAdminDeletedAccountStore = useAdminStore;

// ═══════════════════════════════════════════
// RE-EXPORTS
// ═══════════════════════════════════════════
export * from "./admin-store.types";
export * from "./admin-store.constants";
export * from "./admin-store.utils";
