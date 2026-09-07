import type { UserListItem } from "./users.types";
import type { UserListRecord } from "./users.select";

export function mapUserListItem(user: UserListRecord): UserListItem {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    status: user.status,
    role: user.role,
    emailVerified: user.emailVerified,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    blocked: Boolean(user.roleAssignment?.isBlocked || user.userSecurity?.isBlocked),
    blockedUntil: user.roleAssignment?.blockedUntil ?? user.userSecurity?.blockedUntil ?? null,
    blockReason: user.roleAssignment?.blockedReason ?? user.userSecurity?.blockReason ?? null,
    twoFactorEnabled: Boolean(user.userSecurity?.twoFactorEnabled),
    auditVersion: user.userAudit?.version ?? 1,
    isDeleted: Boolean(user.userAudit?.isDeleted || user.status === "DELETED"),
    roleLevel: user.roleAssignment?.roleConfig.level ?? null,
    roleConfigActive: user.roleAssignment?.roleConfig.isActive ?? null,
    sessionCount: user._count.sessions,
  };
}
