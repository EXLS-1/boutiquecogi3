import { Redis } from "@upstash/redis";
import { prisma } from "@/lib/prisma";

import type { Permission, Restriction, Role } from "./rbac";
import { DEFAULT_ROLE_CONFIG, ROLES } from "./rbac";

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Prefer Redis for cross-instance coherence. If misconfigured, fall back to Prisma only.
let redis: Redis | null = null;
try {
  if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
      cache: "no-store",
    });
  }
} catch {
  redis = null;
}

const TTL_SECONDS = Number(process.env.RBAC_CACHE_TTL_SECONDS ?? 60);

function roleCacheKey(role: Role) {
  return `rbac:role-config:${role}`;
}

function permsCacheKey(role: Role) {
  return `rbac:effective-perms:${role}`;
}

function restrCacheKey(role: Role) {
  return `rbac:effective-restr:${role}`;
}

export type RoleConfigCacheValue = {
  level: number;
  permissions: Record<Permission, "ON" | "OFF">;
  restrictions: Record<Restriction, string | "ON" | "OFF">;
};

export async function getRoleConfigCached(
  role: Role,
): Promise<RoleConfigCacheValue> {
  const fallback = DEFAULT_ROLE_CONFIG[role];

  if (!redis) return fallback;

  const key = roleCacheKey(role);
  const cached = (await redis.get<string>(key)) ?? null;
  if (cached) {
    try {
      return JSON.parse(cached) as RoleConfigCacheValue;
    } catch {
      // ignore
    }
  }

  // Source of truth: Prisma.
  try {
    const dbConfig = await prisma.roleConfig.findFirst({
      where: { role, isActive: true },
      select: { permissions: true, restrictions: true },
    });

    const value: RoleConfigCacheValue = {
      level: fallback.level,
      permissions: {
        ...(fallback.permissions as Record<Permission, "ON" | "OFF">),
        ...((dbConfig?.permissions ?? {}) as Record<Permission, "ON" | "OFF">),
      },
      restrictions: {
        ...(fallback.restrictions as Record<Restriction, string | "ON" | "OFF">),
        ...((dbConfig?.restrictions ?? {}) as Record<
          Restriction,
          string | "ON" | "OFF"
        >),
      },
    };

    await redis.set(key, JSON.stringify(value), { ex: TTL_SECONDS });
    return value;
  } catch {
    return fallback;
  }
}

export async function invalidateRoleCache(role?: Role) {
  if (!redis) return;

  if (role) {
    await redis.del(roleCacheKey(role));
    await redis.del(permsCacheKey(role));
    await redis.del(restrCacheKey(role));
    return;
  }

  // Best-effort: delete all known roles.
  for (const r of Object.values(ROLES) as Role[]) {
    await redis.del(roleCacheKey(r));
    await redis.del(permsCacheKey(r));
    await redis.del(restrCacheKey(r));
  }
}

export async function getEffectivePermissionsCached(
  role: Role,
  compute: () => Promise<Set<Permission>>,
): Promise<Set<Permission>> {
  if (!redis) return compute();

  const key = permsCacheKey(role);
  const cached = (await redis.get<string>(key)) ?? null;
  if (cached) {
    try {
      const arr = JSON.parse(cached) as Permission[];
      return new Set(arr);
    } catch {
      // ignore
    }
  }

  const perms = await compute();
  await redis.set(key, JSON.stringify(Array.from(perms)), { ex: TTL_SECONDS });
  return perms;
}

export async function getEffectiveRestrictionsCached(
  role: Role,
  compute: () => Promise<Map<Restriction, string | "ON" | "OFF">>,
): Promise<Map<Restriction, string | "ON" | "OFF">> {
  if (!redis) {
    return compute();
  }

  const key = restrCacheKey(role);
  const cached = (await redis.get<string>(key)) ?? null;
  if (cached) {
    try {
      const obj = JSON.parse(cached) as Record<Restriction, string | "ON" | "OFF">;
      return new Map(Object.entries(obj) as [Restriction, string | "ON" | "OFF"][]);
    } catch {
      // ignore
    }
  }

  const restrMap = await compute();

  const obj = Object.fromEntries(restrMap.entries()) as Record<
    Restriction,
    string | "ON" | "OFF"
  >;
  await redis.set(key, JSON.stringify(obj), { ex: TTL_SECONDS });
  return restrMap;
}
