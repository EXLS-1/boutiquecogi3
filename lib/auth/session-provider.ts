import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/lib/auth";

import type { AuthenticatedUser, Role } from "@/lib/auth/rbac-shared";
import { getRoleLevel, normalizeRole } from "@/lib/auth/rbac-shared";

/**
 * SessionProvider : encapsule la résolution de session.
 * Objectif : éviter toute dépendance RBAC vers `auth.api.getSession()`.
 */

const _cachedGetSession = cache(async () => {
  const headersList = await headers();
  return auth.api.getSession({ headers: headersList });
});

export async function getSessionFromProvider() {
  return _cachedGetSession();
}

// ─── Type guard pour éviter les casts dangereux ───

interface BetterAuthUserLike {
  id: string;
  email?: string | null;
  name?: string | null;
  /** Role may be present either at top-level or inside metadata depending on the auth provider */
  role?: string | null;
  image?: string | null;
  emailVerified?: boolean | Date | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  metadata?: Record<string, unknown> | null;
}


function isBetterAuthUser(obj: unknown): obj is BetterAuthUserLike {
  if (typeof obj !== "object" || obj === null) return false;
  const u = obj as Record<string, unknown>;
  return typeof u.id === "string";
}

function toDate(value: Date | string | null | undefined): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  return new Date();
}

export async function getCurrentUserFromProvider(): Promise<
  | (AuthenticatedUser & { session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>> })
  | null
> {
  const session = await getSessionFromProvider();
  if (!session?.user || !isBetterAuthUser(session.user)) return null;

  const u = session.user;

  const roleStr =
    u.role ??
    (u.metadata?.role as string | undefined) ??
    "GUEST";

  const role: Role = normalizeRole(roleStr);

  const user: AuthenticatedUser = {
    id: u.id,
    email: u.email ?? "",
    name: u.name ?? null,
    role,
    level: getRoleLevel(role),
    image: u.image ?? null,
    emailVerified: Boolean(u.emailVerified),
    createdAt: toDate(u.createdAt),
    updatedAt: toDate(u.updatedAt),
  };

  return Object.assign(user, { session });
}
