import type { Role } from "@prisma/client";
import { getServerRBACSession } from "@/lib/auth/server";
import { canManageRole, getRoleLevel, normalizeRole, ROLES, type Permission } from "@/lib/auth/rbac";
import { USER_PERMISSION } from "./users.constants";
import { CannotModifyTargetUserError, UsersError } from "./users.errors";

export interface AuthorizedActor {
  userId: string;
  role: Role;
  level: number;
}

function sessionRole(
  session: Awaited<ReturnType<typeof getServerRBACSession>>,
): Role {
  const raw = session?.role?.name;
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new UsersError("Rôle de session invalide.", "INVALID_ACTOR_ROLE");
  }

  const normalized = normalizeRole(raw);
  if (!Object.values(ROLES).includes(normalized)) {
    throw new UsersError("Rôle de session invalide.", "INVALID_ACTOR_ROLE");
  }

  return normalized as Role;
}

export async function requireUsersPermission(
  permission: Permission,
): Promise<AuthorizedActor> {
  const session = await getServerRBACSession();

  if (!session?.userId) {
    throw new UsersError("Authentification requise.", "UNAUTHENTICATED");
  }

  const role = sessionRole(session);
  const level = getRoleLevel(role);

  if (!Number.isInteger(level) || level < 1 || level > 7) {
    throw new UsersError("Niveau RBAC invalide.", "INVALID_ACTOR_LEVEL");
  }

  // Fail closed: l'absence du Set de permissions est un refus.
  if (!(session.effectivePermissions instanceof Set)) {
    throw new UsersError("Évaluation RBAC indisponible.", "RBAC_EVALUATION_FAILED");
  }

  if (!session.effectivePermissions.has(permission)) {
    throw new UsersError("Permission insuffisante.", "FORBIDDEN");
  }

  return { userId: session.userId, role, level };
}

export function assertCanManageTarget(
  actor: AuthorizedActor,
  targetRole: Role,
): void {
  if (!actor.userId || !Number.isInteger(actor.level)) {
    throw new CannotModifyTargetUserError();
  }

  if (!canManageRole(actor.role, targetRole)) {
    throw new CannotModifyTargetUserError();
  }
}

export const USER_ACTION_PERMISSIONS = {
  READ: USER_PERMISSION.READ,
  UPDATE: USER_PERMISSION.UPDATE,
  BLOCK: USER_PERMISSION.BLOCK,
  ROLE: USER_PERMISSION.ROLE,
  DELETE: USER_PERMISSION.DELETE,
} as const;
