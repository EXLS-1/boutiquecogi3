import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { USER_UUID_RE } from "./users.constants";
import { userListSelect } from "./users.select";
import type { UsersQueryInput } from "./users.types";

function buildWhere(input: UsersQueryInput): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  if (input.status) where.status = input.status;
  if (input.role) where.role = input.role;
  if (input.blocked !== undefined) {
    where.OR = [
      { roleAssignment: { is: { isBlocked: input.blocked } } },
      { userSecurity: { is: { isBlocked: input.blocked } } },
    ];
  }
  if (input.search) {
    const or: Prisma.UserWhereInput[] = [
      { email: { contains: input.search, mode: "insensitive" } },
      { name: { contains: input.search, mode: "insensitive" } },
    ];
    if (USER_UUID_RE.test(input.search)) or.push({ id: input.search });
    where.AND = [{ OR: or }];
  }
  return where;
}

function buildOrderBy(input: UsersQueryInput): Prisma.UserOrderByWithRelationInput {
  return { [input.sortBy]: input.sortDirection } as Prisma.UserOrderByWithRelationInput;
}

export async function listUsers(input: UsersQueryInput) {
  const where = buildWhere(input);
  const skip = (input.page - 1) * input.pageSize;
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: userListSelect,
      orderBy: buildOrderBy(input),
      skip,
      take: input.pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total };
}

export async function findUserForAuthorization(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      status: true,
      roleAssignment: { select: { roleConfig: { select: { role: true, level: true, isActive: true } } } },
      userAudit: { select: { version: true, isDeleted: true } },
    },
  });
}

export async function updateUserWithVersion(
  tx: Prisma.TransactionClient,
  input: { userId: string; expectedVersion: number; data: Prisma.UserUpdateInput },
) {
  const audit = await tx.userAudit.updateMany({
    where: { userId: input.userId, version: input.expectedVersion, isDeleted: false },
    data: { version: { increment: 1 } },
  });
  if (audit.count !== 1) return null;
  return tx.user.update({ where: { id: input.userId }, data: input.data, select: userListSelect });
}

export { buildWhere };
