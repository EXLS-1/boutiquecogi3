import { Prisma } from "@prisma/client";

export const userListSelect = {
  id: true,
  email: true,
  name: true,
  image: true,
  status: true,
  role: true,
  emailVerified: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
  roleAssignment: {
    select: {
      isBlocked: true,
      blockedUntil: true,
      blockedReason: true,
      roleConfig: {
        select: {
          level: true,
          isActive: true,
        },
      },
    },
  },
  userSecurity: {
    select: {
      isBlocked: true,
      blockedUntil: true,
      blockReason: true,
      twoFactorEnabled: true,
    },
  },
  userAudit: {
    select: {
      isDeleted: true,
      version: true,
    },
  },
  _count: {
    select: {
      sessions: true,
    },
  },
} satisfies Prisma.UserSelect;

export type UserListRecord = Prisma.UserGetPayload<{ select: typeof userListSelect }>;
