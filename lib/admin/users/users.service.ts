import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRoleLevel } from "@/lib/auth/rbac";
import { USER_AUDIT_ACTION, USER_TARGET_TYPE } from "./users.constants";
import { assertCanManageTarget, type AuthorizedActor } from "./users.authorization";
import {
  CannotModifyTargetUserError,
  InvalidUserRoleError,
  UserAlreadyBlockedError,
  UserNotBlockedError,
  UserNotFoundError,
  UserVersionConflictError,
} from "./users.errors";
import { mapUserListItem } from "./users.mapper";
import { userListSelect } from "./users.select";
import { listUsers, findUserForAuthorization } from "./users.repository";
import type { UsersQueryInput, UpdateUserInput, BlockUserInput, UnblockUserInput, ChangeUserRoleInput, DeleteUserInput } from "./users.types";

async function targetOrThrow(userId: string) {
  const target = await findUserForAuthorization(userId);
  if (!target) throw new UserNotFoundError();
  if (target.userAudit?.isDeleted || target.status === "DELETED") throw new CannotModifyTargetUserError();
  return target;
}

function assertNotSelfForDangerousAction(actor: AuthorizedActor, targetId: string) {
  if (actor.userId === targetId) throw new CannotModifyTargetUserError();
}

async function assertSuperAdminSafety(tx: Prisma.TransactionClient, targetRole: Role) {
  if (targetRole !== "SUPER_ADMIN") return;
  const count = await tx.user.count({ where: { role: "SUPER_ADMIN", status: { not: "DELETED" } } });
  if (count <= 1) throw new CannotModifyTargetUserError();
}

function serializeSnapshot(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function writeAudit(
  tx: Prisma.TransactionClient,
  actor: AuthorizedActor,
  action: string,
  targetId: string,
  oldValue: Prisma.InputJsonValue | undefined,
  newValue: Prisma.InputJsonValue | undefined,
) {
  await tx.auditLog.create({
    data: {
      userId: actor.userId,
      roleLevel: actor.level,
      action,
      targetId,
      targetType: USER_TARGET_TYPE,
      entity: USER_TARGET_TYPE,
      entityType: USER_TARGET_TYPE,
      entityId: targetId,
      oldValue,
      newValue,
      status: "SUCCESS",
    },
  });
}

export async function getUsers(input: UsersQueryInput) {
  const result = await listUsers(input);
  return {
    items: result.items.map(mapUserListItem),
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / input.pageSize)),
      hasNextPage: input.page * input.pageSize < result.total,
      hasPreviousPage: input.page > 1,
    },
  };
}

export async function getUserDetails(actor: AuthorizedActor, userId: string) {
  const target = await targetOrThrow(userId);
  assertCanManageTarget(actor, target.role);
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, image: true, status: true, role: true,
      emailVerified: true, emailVerifiedAt: true, createdAt: true, updatedAt: true,
      roleAssignment: { select: { isBlocked: true, blockedAt: true, blockedUntil: true, blockedReason: true, roleConfig: { select: { role: true, level: true, isActive: true } } } },
      userSecurity: { select: { isBlocked: true, blockedAt: true, blockedUntil: true, blockReason: true, twoFactorEnabled: true } },
      userAudit: { select: { version: true, isDeleted: true, deletedAt: true, updatedById: true, deletedById: true } },
      _count: { select: { sessions: true, accounts: true, orders: true, addresses: true } },
    },
  });
}

export async function updateUser(actor: AuthorizedActor, input: UpdateUserInput) {
  const target = await targetOrThrow(input.userId);
  assertCanManageTarget(actor, target.role);
  if (actor.userId === input.userId && input.status === "DELETED") throw new CannotModifyTargetUserError();

  const data: Prisma.UserUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.status !== undefined) data.status = input.status;

  return prisma.$transaction(async (tx) => {
    const audit = await tx.userAudit.updateMany({
      where: { userId: input.userId, version: input.expectedVersion, isDeleted: false },
      data: { version: { increment: 1 }, updatedById: actor.userId },
    });
    if (audit.count !== 1) throw new UserVersionConflictError();

    const updated = await tx.user.update({ where: { id: input.userId }, data, select: userListSelect });
    await writeAudit(tx, actor, USER_AUDIT_ACTION.UPDATED, input.userId, { status: target.status, name: target.name }, { status: input.status ?? target.status, name: input.name !== undefined ? input.name : target.name });
    return updated;
  });
}

export async function blockUser(actor: AuthorizedActor, input: BlockUserInput) {
  const target = await targetOrThrow(input.userId);
  assertCanManageTarget(actor, target.role);
  assertNotSelfForDangerousAction(actor, input.userId);

  return prisma.$transaction(async (tx) => {
    await assertSuperAdminSafety(tx, target.role);
    const security = await tx.userSecurity.findUnique({ where: { userId: input.userId }, select: { isBlocked: true } });
    if (security?.isBlocked || (await tx.roleAssignment.findUnique({ where: { userId: input.userId }, select: { isBlocked: true } }))?.isBlocked) {
      throw new UserAlreadyBlockedError();
    }
    const audit = await tx.userAudit.updateMany({ where: { userId: input.userId, version: input.expectedVersion, isDeleted: false }, data: { version: { increment: 1 }, updatedById: actor.userId } });
    if (audit.count !== 1) throw new UserVersionConflictError();

    await tx.userSecurity.upsert({
      where: { userId: input.userId },
      create: { userId: input.userId, isBlocked: true, blockedAt: new Date(), blockedUntil: input.blockedUntil ?? null, blockReason: input.reason },
      update: { isBlocked: true, blockedAt: new Date(), blockedUntil: input.blockedUntil ?? null, blockReason: input.reason },
    });
    await tx.roleAssignment.updateMany({ where: { userId: input.userId }, data: { isBlocked: true, blockedAt: new Date(), blockedUntil: input.blockedUntil ?? null, blockedReason: input.reason } });
    await tx.user.update({ where: { id: input.userId }, data: { status: "SUSPENDED" } });
    await tx.session.deleteMany({ where: { userId: input.userId } });
    await writeAudit(tx, actor, USER_AUDIT_ACTION.BLOCKED, input.userId, { status: target.status }, { status: "SUSPENDED", reason: input.reason });
    return { success: true };
  });
}

export async function unblockUser(actor: AuthorizedActor, input: UnblockUserInput) {
  const target = await targetOrThrow(input.userId);
  assertCanManageTarget(actor, target.role);

  return prisma.$transaction(async (tx) => {
    const security = await tx.userSecurity.findUnique({ where: { userId: input.userId }, select: { isBlocked: true } });
    const assignment = await tx.roleAssignment.findUnique({ where: { userId: input.userId }, select: { isBlocked: true } });
    if (!security?.isBlocked && !assignment?.isBlocked) throw new UserNotBlockedError();
    const audit = await tx.userAudit.updateMany({ where: { userId: input.userId, version: input.expectedVersion, isDeleted: false }, data: { version: { increment: 1 }, updatedById: actor.userId } });
    if (audit.count !== 1) throw new UserVersionConflictError();

    await tx.userSecurity.updateMany({ where: { userId: input.userId }, data: { isBlocked: false, blockedAt: null, blockedUntil: null, blockReason: null } });
    await tx.roleAssignment.updateMany({ where: { userId: input.userId }, data: { isBlocked: false, blockedAt: null, blockedUntil: null, blockedReason: null } });
    await tx.user.update({ where: { id: input.userId }, data: { status: "ACTIVE" } });
    await writeAudit(tx, actor, USER_AUDIT_ACTION.UNBLOCKED, input.userId, { status: target.status }, { status: "ACTIVE" });
    return { success: true };
  });
}

export async function changeUserRole(actor: AuthorizedActor, input: ChangeUserRoleInput) {
  const target = await targetOrThrow(input.userId);
  assertCanManageTarget(actor, target.role);
  assertNotSelfForDangerousAction(actor, input.userId);

  const targetLevel = getRoleLevel(input.role);
  if (!Number.isInteger(targetLevel)) throw new InvalidUserRoleError();
  if (targetLevel <= actor.level) throw new CannotModifyTargetUserError();

  return prisma.$transaction(async (tx) => {
    await assertSuperAdminSafety(tx, target.role);
    const roleConfig = await tx.roleConfig.findUnique({ where: { role: input.role }, select: { id: true, role: true, level: true, isActive: true } });
    if (!roleConfig?.isActive || roleConfig.level !== targetLevel) throw new InvalidUserRoleError();
    const audit = await tx.userAudit.updateMany({ where: { userId: input.userId, version: input.expectedVersion, isDeleted: false }, data: { version: { increment: 1 }, updatedById: actor.userId } });
    if (audit.count !== 1) throw new UserVersionConflictError();

    await tx.user.update({ where: { id: input.userId }, data: { role: input.role } });
    await tx.roleAssignment.upsert({ where: { userId: input.userId }, create: { userId: input.userId, roleId: roleConfig.id, assignedBy: actor.userId }, update: { roleId: roleConfig.id, assignedBy: actor.userId, assignedAt: new Date(), lastVerifiedAt: new Date() } });
    await writeAudit(tx, actor, USER_AUDIT_ACTION.ROLE_CHANGED, input.userId, { role: target.role }, { role: input.role });
    return { success: true, role: input.role };
  });
}

export async function deleteUser(actor: AuthorizedActor, input: DeleteUserInput) {
  const target = await targetOrThrow(input.userId);
  assertCanManageTarget(actor, target.role);
  assertNotSelfForDangerousAction(actor, input.userId);

  return prisma.$transaction(async (tx) => {
    await assertSuperAdminSafety(tx, target.role);
    const audit = await tx.userAudit.updateMany({ where: { userId: input.userId, version: input.expectedVersion, isDeleted: false }, data: { version: { increment: 1 }, updatedById: actor.userId, deletedById: actor.userId, deletedAt: new Date(), isDeleted: true } });
    if (audit.count !== 1) throw new UserVersionConflictError();

    const snapshot = await tx.user.findUnique({
      where: { id: input.userId },
      include: { accounts: true, sessions: true, addresses: true, roleAssignment: { include: { roleConfig: true, permissionOverrides: true } }, userSecurity: true, userPreferences: true, userQuota: true },
    });
    if (!snapshot) throw new UserNotFoundError();

    await tx.deletedAccountRegistry.create({ data: { userId: snapshot.id, userEmail: snapshot.email, userName: snapshot.name, deletedBy: actor.userId, deletedByRole: actor.role, userSnapshot: serializeSnapshot(snapshot), reason: input.reason } });
    await tx.user.update({ where: { id: input.userId }, data: { status: "DELETED" } });
    await tx.session.deleteMany({ where: { userId: input.userId } });
    await writeAudit(tx, actor, USER_AUDIT_ACTION.DELETED, input.userId, { status: target.status }, { status: "DELETED", reason: input.reason });
    return { success: true };
  });
}
