// /lib/auth/server.ts

import { getSession } from "better-auth/server";
import { cookies } from "next/headers";
import { rolePermissions, Permission } from "./rbac";

export async function getServerSession() {
  return await getSession({ cookies });
}

export async function requireUser() {
  const session = await getServerSession();

  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }

  return session.user;
}

export async function requireRole(requiredRole: string) {
  const user = await requireUser();

  if (user.role !== requiredRole) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();

  const permissions = rolePermissions[user.role] ?? [];

  if (!permissions.includes(permission)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}