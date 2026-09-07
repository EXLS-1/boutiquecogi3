import type { Role } from "@prisma/client";
import type { UserSortDirection, UserSortField, UserStatus } from "./users.constants";

export interface UsersQueryInput {
  page: number;
  pageSize: number;
  search?: string;
  status?: UserStatus;
  role?: Role;
  blocked?: boolean;
  sortBy: UserSortField;
  sortDirection: UserSortDirection;
}

export interface UsersPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UserListItem {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  status: string;
  role: Role;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  blocked: boolean;
  blockedUntil: Date | null;
  blockReason: string | null;
  twoFactorEnabled: boolean;
  auditVersion: number;
  isDeleted: boolean;
  roleLevel: number | null;
  roleConfigActive: boolean | null;
  sessionCount: number;
}

export interface UsersResult {
  items: UserListItem[];
  pagination: UsersPagination;
}

export interface UpdateUserInput {
  userId: string;
  expectedVersion: number;
  name?: string | null;
  status?: UserStatus;
}

export interface BlockUserInput {
  userId: string;
  expectedVersion: number;
  reason: string;
  blockedUntil?: Date | null;
}

export interface UnblockUserInput {
  userId: string;
  expectedVersion: number;
}

export interface ChangeUserRoleInput {
  userId: string;
  expectedVersion: number;
  role: Role;
}

export interface DeleteUserInput {
  userId: string;
  expectedVersion: number;
  reason: string;
}
