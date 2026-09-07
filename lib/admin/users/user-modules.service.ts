// lib/admin/users/user-modules.service.ts
// ============================================================
// Services serveur pour les modules utilisateurs :
// Comptes, Rattachements RBAC, Auditlog et Paramètres.
// Logique identique à users.service.ts : requireUsersPermission
// (RBAC fail-closed) + client Prisma avec selects stricts.
// ============================================================

import { prisma } from "@/lib/prisma";
import { requireUsersPermission } from "./users.authorization";
import { USER_PERMISSION } from "./users.constants";
import { UsersError } from "./users.errors";

const MAX_AUDIT_LOGS = 100;

export interface UserAccountRow {
  id: string;
  email: string;
  name: string | null;
  status: string;
  role: string;
  twoFactorEnabled: boolean;
  isBlocked: boolean;
  providerCount: number;
  sessionCount: number;
  createdAt: Date;
}

export interface UserRoleAssignmentRow {
  userId: string;
  email: string;
  name: string | null;
  userRole: string;
  assignedRole: string | null;
  level: number | null;
  isActive: boolean | null;
  isBlocked: boolean | null;
  assignedAt: Date | null;
  overrideCount: number;
}

export interface UserAuditLogRow {
  id: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  targetId: string | null;
  status: string | null;
  createdAt: Date;
}

export interface UserSettingsSummary {
  totalUsers: number;
  preferencesConfigured: number;
  quotasConfigured: number;
  twoFactorEnabled: number;
  blockedUsers: number;
  byLanguage: { language: string; count: number }[];
}

/* ── Compte utilisateur ─────────────────────────────── */

export async function listUserAccounts(): Promise<UserAccountRow[]> {
  await requireUsersPermission(USER_PERMISSION.READ);

  const users = await prisma.user.findMany({
    where: { status: { not: "DELETED" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      role: true,
      createdAt: true,
      accounts: { select: { providerId: true } },
      sessions: { select: { id: true } },
      userSecurity: { select: { twoFactorEnabled: true, isBlocked: true } },
    },
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    status: u.status,
    role: u.role,
    twoFactorEnabled: u.userSecurity?.twoFactorEnabled ?? false,
    isBlocked: u.userSecurity?.isBlocked ?? false,
    providerCount: u.accounts.length,
    sessionCount: u.sessions.length,
    createdAt: u.createdAt,
  }));
}

/* ── Rôle utilisateur (rattachements RBAC) ──────────── */

export async function listUserRoleAssignments(): Promise<UserRoleAssignmentRow[]> {
  await requireUsersPermission(USER_PERMISSION.ROLE);

  const users = await prisma.user.findMany({
    where: { status: { not: "DELETED" } },
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      roleAssignment: {
        select: {
          isBlocked: true,
          assignedAt: true,
          roleConfig: { select: { role: true, level: true, isActive: true } },
          permissionOverrides: { select: { id: true } },
        },
      },
    },
  });

  return users.map((u) => ({
    userId: u.id,
    email: u.email,
    name: u.name,
    userRole: u.role,
    assignedRole: u.roleAssignment?.roleConfig?.role ?? null,
    level: u.roleAssignment?.roleConfig?.level ?? null,
    isActive: u.roleAssignment?.roleConfig?.isActive ?? null,
    isBlocked: u.roleAssignment?.isBlocked ?? null,
    assignedAt: u.roleAssignment?.assignedAt ?? null,
    overrideCount: u.roleAssignment?.permissionOverrides.length ?? 0,
  }));
}

/* ── Auditlog utilisateur ───────────────────────────── */

export async function listUserAuditLogs(take = 50): Promise<UserAuditLogRow[]> {
  if (!Number.isInteger(take) || take < 1 || take > MAX_AUDIT_LOGS) {
    throw new UsersError("Paramètre take invalide.", "INVALID_TAKE");
  }
  await requireUsersPermission(USER_PERMISSION.READ);

  const logs = await prisma.auditLog.findMany({
    where: { entity: "USER" },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      action: true,
      userId: true,
      targetId: true,
      status: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    actorId: log.userId,
    actorName: log.user?.name ?? log.user?.email ?? null,
    targetId: log.targetId,
    status: log.status,
    createdAt: log.createdAt,
  }));
}

/* ── Paramètre utilisateur ──────────────────────────── */

export async function getUserSettingsSummary(): Promise<UserSettingsSummary> {
  await requireUsersPermission(USER_PERMISSION.READ);

  const [totalUsers, preferencesConfigured, quotasConfigured, twoFactorEnabled, blockedUsers, languages] =
    await Promise.all([
      prisma.user.count({ where: { status: { not: "DELETED" } } }),
      prisma.userPreferences.count(),
      prisma.userQuota.count(),
      prisma.userSecurity.count({ where: { twoFactorEnabled: true } }),
      prisma.userSecurity.count({ where: { isBlocked: true } }),
      prisma.userPreferences.groupBy({ by: ["language"], _count: { language: true } }),
    ]);

  return {
    totalUsers,
    preferencesConfigured,
    quotasConfigured,
    twoFactorEnabled,
    blockedUsers,
    byLanguage: languages.map((l) => ({ language: l.language, count: l._count.language })),
  };
}
