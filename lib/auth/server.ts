// /lib/auth/server.ts

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth"; // Ton instance configurée de Better-Auth
import { ROLES, Role, Permission, hasPermission } from "./rbac";

export async function getServerSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

/**
 * Exige une session valide. Redirige sinon.
 */
export async function requireAuth() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/login");
  }

  // Sécurisation stricte du rôle
  const rawRole = session.user.role;
  const userRole: Role = Object.values(ROLES).includes(rawRole as Role) 
    ? (rawRole as Role) 
    : ROLES.USER;

  return {
    ...session.user,
    role: userRole,
  };
}

/**
 * Exige une permission spécifique. Jette une erreur si refusé.
 */
export async function requirePermission(permission: Permission) {
  const user = await requireAuth();

  if (!hasPermission(user.role, permission)) {
    throw new Error(`FORBIDDEN: Missing ${permission}`);
  }

  return user;
}