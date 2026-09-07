import { z } from "zod";
import { Role } from "@prisma/client";
import {
  USER_ROLES,
  USER_SORT_DIRECTIONS,
  USER_SORT_FIELDS,
  USER_STATUSES,
  USERS_DEFAULT_PAGE,
  USERS_DEFAULT_PAGE_SIZE,
  USERS_MAX_BLOCK_REASON_LENGTH,
  USERS_MAX_PAGE_SIZE,
  USERS_MAX_UPDATE_NAME_LENGTH,
  USERS_MIN_PAGE_SIZE,
  USERS_SEARCH_MAX_LENGTH,
} from "./users.constants";

const uuid = z.string().uuid();
const role = z.enum(USER_ROLES);

export const usersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(USERS_DEFAULT_PAGE),
  pageSize: z.coerce.number().int().min(USERS_MIN_PAGE_SIZE).max(USERS_MAX_PAGE_SIZE).default(USERS_DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(USERS_SEARCH_MAX_LENGTH).optional().transform((value) => value || undefined),
  status: z.enum(USER_STATUSES).optional(),
  role: z.nativeEnum(Role).optional(),
  blocked: z.coerce.boolean().optional(),
  sortBy: z.enum(USER_SORT_FIELDS).default("createdAt"),
  sortDirection: z.enum(USER_SORT_DIRECTIONS).default("desc"),
});

export const updateUserSchema = z.object({
  userId: uuid,
  expectedVersion: z.number().int().positive(),
  name: z.string().trim().max(USERS_MAX_UPDATE_NAME_LENGTH).nullable().optional(),
  status: z.enum(USER_STATUSES).optional(),
}).refine((data) => data.name !== undefined || data.status !== undefined, {
  message: "Au moins un champ doit être modifié.",
});

export const blockUserSchema = z.object({
  userId: uuid,
  expectedVersion: z.number().int().positive(),
  reason: z.string().trim().min(5).max(USERS_MAX_BLOCK_REASON_LENGTH),
  blockedUntil: z.coerce.date().nullable().optional(),
});

export const unblockUserSchema = z.object({
  userId: uuid,
  expectedVersion: z.number().int().positive(),
});

export const changeUserRoleSchema = z.object({
  userId: uuid,
  expectedVersion: z.number().int().positive(),
  role,
});

export const deleteUserSchema = z.object({
  userId: uuid,
  expectedVersion: z.number().int().positive(),
  reason: z.string().trim().min(5).max(USERS_MAX_BLOCK_REASON_LENGTH),
});

export type UsersQuerySchema = z.infer<typeof usersQuerySchema>;
export type UpdateUserSchema = z.infer<typeof updateUserSchema>;
export type BlockUserSchema = z.infer<typeof blockUserSchema>;
export type UnblockUserSchema = z.infer<typeof unblockUserSchema>;
export type ChangeUserRoleSchema = z.infer<typeof changeUserRoleSchema>;
export type DeleteUserSchema = z.infer<typeof deleteUserSchema>;
