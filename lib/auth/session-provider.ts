import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/lib/auth";

import type { AuthenticatedUser } from "@/lib/auth/server";
import type { Role } from "@/lib/auth/rbac";
import { getRoleLevel, normalizeRole } from "@/lib/auth/rbac";

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

export async function getCurrentUserFromProvider(): Promise<
  | (AuthenticatedUser & { session: NonNullable<ReturnType<typeof auth.api.getSession>> })
  | null
> {
  const session = await getSessionFromProvider();
  if (!session?.user) return null;

  const roleStr =
    ((session.user as Record<string, unknown>).role as string | undefined) ??
    (
      (session.user as Record<string, unknown>).metadata as Record<
        string,
        unknown
      >
    )?.role ??
    "USER";

  const role: Role = normalizeRole(roleStr as string);

  const user: AuthenticatedUser = {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    role,
    level: getRoleLevel(role),
    image: (session.user as Record<string, unknown>).image as
      | string
      | null
      | undefined,
    emailVerified:
      ((session.user as Record<string, unknown>).emailVerified as boolean) ??
      false,
    createdAt: new Date(
      (session.user as Record<string, unknown>).createdAt as string,
    ),
    updatedAt: new Date(
      (session.user as Record<string, unknown>).updatedAt as string,
    ),
  };

  return Object.assign(user, { session });
}

