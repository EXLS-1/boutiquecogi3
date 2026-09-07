import type { Role } from "@prisma/client";

export const USERS_DEFAULT_PAGE = 1;
export const USERS_DEFAULT_PAGE_SIZE = 25;
export const USERS_MIN_PAGE_SIZE = 10;
export const USERS_MAX_PAGE_SIZE = 100;
export const USERS_SEARCH_MAX_LENGTH = 100;
export const USERS_MAX_BLOCK_REASON_LENGTH = 500;
export const USERS_MAX_UPDATE_NAME_LENGTH = 120;

export const USER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "EDITOR",
  "SUPERVISOR",
  "USER",
  "GUEST",
] as const satisfies readonly Role[];

export const USER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING", "DELETED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_PERMISSION = {
  READ: "users:read",
  UPDATE: "users:update",
  BLOCK: "users:block",
  ROLE: "settings:roles-manage",
  DELETE: "users:delete",
} as const;

export const USER_AUDIT_ACTION = {
  UPDATED: "USER_UPDATED",
  BLOCKED: "USER_BLOCKED",
  UNBLOCKED: "USER_UNBLOCKED",
  ROLE_CHANGED: "USER_ROLE_CHANGED",
  DELETED: "USER_DELETED",
} as const;

export const USER_TARGET_TYPE = "USER" as const;

export const USER_SORT_FIELDS = ["createdAt", "updatedAt", "name", "email", "status"] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

export const USER_SORT_DIRECTIONS = ["asc", "desc"] as const;
export type UserSortDirection = (typeof USER_SORT_DIRECTIONS)[number];

export const USER_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
