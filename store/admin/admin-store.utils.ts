// store/admin/admin-store.utils.ts
// ============================================
// ADMIN STORE UTILS — Filtrage, Tri, Pagination & Rollback optimiste
// ============================================

import type {
  AdminUser,
  BlockedUser,
  UserFiltersState,
  AccountItem,
  AccountFiltersState,
  DeletedAccountItem,
  DeletedAccountFiltersState,
  PaginationInfo,
} from "./admin-store.types";

// ─── Comparateurs sécurisés ────────────────

export function safeStringCompare(
  a: string | null | undefined,
  b: string | null | undefined,
  order: "asc" | "desc" = "asc"
): number {
  const dir = order === "asc" ? 1 : -1;
  const strA = (a ?? "").toLowerCase();
  const strB = (b ?? "").toLowerCase();
  return strA.localeCompare(strB) * dir;
}

export function safeDateCompare(
  a: Date | string | number | null | undefined,
  b: Date | string | number | null | undefined,
  order: "asc" | "desc" = "desc"
): number {
  const dir = order === "asc" ? 1 : -1;
  const timeA = a ? new Date(a).getTime() : 0;
  const timeB = b ? new Date(b).getTime() : 0;
  return (timeA - timeB) * dir;
}

// ─── Filtrage & Tri : Utilisateurs ─────────

export function filterAndSortUsers(
  users: readonly AdminUser[],
  filters: UserFiltersState
): AdminUser[] {
  let result = [...users];

  // Recherche textuelle multi-champs
  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.id && u.id.toLowerCase().includes(q))
    );
  }

  // Filtre par rôle
  if (filters.roleFilter !== "ALL") {
    result = result.filter((u) => u.role === filters.roleFilter);
  }

  // Filtre par statut
  if (filters.statusFilter !== "ALL") {
    result = result.filter((u) => {
      if (filters.statusFilter === "BLOCKED") return u.isBlocked;
      if (filters.statusFilter === "ACTIVE") return !u.isBlocked && !!u.emailVerified;
      if (filters.statusFilter === "PENDING") return !u.isBlocked && !u.emailVerified;
      return true;
    });
  }

  // Tri
  result.sort((a, b) => {
    switch (filters.sortBy) {
      case "name":
        return safeStringCompare(a.name, b.name, filters.sortOrder);
      case "email":
        return safeStringCompare(a.email, b.email, filters.sortOrder);
      case "role": {
        const dir = filters.sortOrder === "asc" ? 1 : -1;
        return (a.roleLevel - b.roleLevel) * dir;
      }
      case "createdAt":
      default:
        return safeDateCompare(a.createdAt, b.createdAt, filters.sortOrder);
    }
  });

  return result;
}

// ─── Filtrage & Tri : Utilisateurs Bloqués ─

export function filterAndSortBlockedUsers(
  blockedUsers: readonly BlockedUser[],
  filters: UserFiltersState
): BlockedUser[] {
  let result = [...blockedUsers];

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.blockedReason && u.blockedReason.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
    );
  }

  result.sort((a, b) => {
    if (filters.sortBy === "name") {
      return safeStringCompare(a.name, b.name, filters.sortOrder);
    }
    return safeDateCompare(a.blockedAt, b.blockedAt, filters.sortOrder);
  });

  return result;
}

// ─── Filtrage & Tri : Comptes Liés ─────────

export function filterAndSortAccounts(
  accounts: readonly AccountItem[],
  filters: AccountFiltersState
): AccountItem[] {
  let result = [...accounts];

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter(
      (a) =>
        a.provider.toLowerCase().includes(q) ||
        a.providerAccountId.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        (a.user?.email && a.user.email.toLowerCase().includes(q)) ||
        (a.user?.name && a.user.name.toLowerCase().includes(q))
    );
  }

  if (filters.provider && filters.provider !== "ALL") {
    result = result.filter((a) => a.provider === filters.provider);
  }

  if (filters.type && filters.type !== "ALL") {
    result = result.filter((a) => a.type === filters.type);
  }

  result.sort((a, b) => {
    switch (filters.sortBy) {
      case "type":
        return safeStringCompare(a.type, b.type, filters.sortOrder);
      case "userEmail":
        return safeStringCompare(a.user?.email, b.user?.email, filters.sortOrder);
      case "expiresAt": {
        const dir = filters.sortOrder === "asc" ? 1 : -1;
        return ((a.expiresAt ?? 0) - (b.expiresAt ?? 0)) * dir;
      }
      case "provider":
      default:
        return safeStringCompare(a.provider, b.provider, filters.sortOrder);
    }
  });

  return result;
}

// ─── Filtrage & Tri : Registre Comptes Supprimés ─

export function filterAndSortDeletedAccounts(
  entries: readonly DeletedAccountItem[],
  filters: DeletedAccountFiltersState
): DeletedAccountItem[] {
  let result = [...entries];

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter(
      (e) =>
        e.userEmail.toLowerCase().includes(q) ||
        (e.userName && e.userName.toLowerCase().includes(q)) ||
        e.reason.toLowerCase().includes(q) ||
        e.deletedByRole.toLowerCase().includes(q) ||
        e.deletedBy.toLowerCase().includes(q)
    );
  }

  result.sort((a, b) => {
    switch (filters.sortBy) {
      case "userEmail":
        return safeStringCompare(a.userEmail, b.userEmail, filters.sortOrder);
      case "userName":
        return safeStringCompare(a.userName, b.userName, filters.sortOrder);
      case "deletedBy":
        return safeStringCompare(a.deletedByRole, b.deletedByRole, filters.sortOrder);
      case "createdAt":
      default:
        return safeDateCompare(a.createdAt, b.createdAt, filters.sortOrder);
    }
  });

  return result;
}

// ─── Pagination Générique ──────────────────

export function paginateList<T>(
  items: readonly T[],
  page: number,
  pageSize: number
): T[] {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safeSize;
  return items.slice(start, start + safeSize);
}

export function calculateTotalPages(total: number, pageSize: number): number {
  const safeSize = Math.max(1, pageSize);
  return Math.max(1, Math.ceil(total / safeSize));
}

export function buildPaginationInfo(
  total: number,
  page: number,
  pageSize: number
): PaginationInfo {
  return {
    total,
    page: Math.max(1, page),
    pageSize: Math.max(1, pageSize),
    totalPages: calculateTotalPages(total, pageSize),
  };
}

// ─── Compteurs de Filtres Actifs ───────────

export function countActiveUserFilters(filters: UserFiltersState): number {
  let count = 0;
  if (filters.search.trim()) count++;
  if (filters.roleFilter !== "ALL") count++;
  if (filters.statusFilter !== "ALL") count++;
  return count;
}

export function countActiveAccountFilters(filters: AccountFiltersState): number {
  let count = 0;
  if (filters.search.trim()) count++;
  if (filters.provider !== "ALL") count++;
  if (filters.type !== "ALL") count++;
  return count;
}

export function countActiveDeletedFilters(filters: DeletedAccountFiltersState): number {
  let count = 0;
  if (filters.search.trim()) count++;
  return count;
}

// ─── Rollback & Versioning Optimiste ───────

/**
 * Clone profond sécurisé d'un ensemble d'entités pour snapshot atomique
 */
export function cloneSnapshot<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map((item) => ({ ...item })) as unknown as T;
  }
  return { ...(data as object) } as T;
}

/**
 * Applique un patch optimiste sur une entité avec incrémentation de version et flag _optimistic
 */
export function applyOptimisticPatch<
  T extends { id?: string; userId?: string; version?: number; _optimistic?: boolean; _pendingAction?: string; _optimisticAt?: number }
>(
  list: readonly T[],
  id: string,
  patch: Partial<T>,
  actionName?: string,
  key: "id" | "userId" = "id"
): T[] {
  return list.map((item) => {
    if (item[key] === id) {
      return {
        ...item,
        ...patch,
        version: typeof item.version === "number" ? item.version + 1 : 1,
        _optimistic: true,
        _pendingAction: actionName,
        _optimisticAt: Date.now(),
      };
    }
    return item;
  });
}

/**
 * Réconcilie une entité après réponse du serveur (nettoie _optimistic et met à jour la version)
 */
export function reconcileEntity<
  T extends { id?: string; userId?: string; version?: number; _optimistic?: boolean; _pendingAction?: string; _optimisticAt?: number }
>(
  list: readonly T[],
  serverEntity: T,
  key: "id" | "userId" = "id"
): T[] {
  const matchId = serverEntity[key];
  return list.map((item) => {
    if (item[key] === matchId) {
      return {
        ...serverEntity,
        _optimistic: false,
        _pendingAction: undefined,
        _optimisticAt: undefined,
      };
    }
    return item;
  });
}
