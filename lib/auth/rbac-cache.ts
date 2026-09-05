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
const UPSTASH_TIMEOUT_MS = Number(process.env.UPSTASH_TIMEOUT_MS ?? 2000);

// Helper to execute Upstash Redis with timeout and fail-fast
async function redisGetWithTimeout<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const result = await Promise.race([
      redis.get<T>(key),
      new Promise<null>((_, reject) =>
        setTimeout(
          () => reject(new Error("Upstash Redis timeout")),
          UPSTASH_TIMEOUT_MS
        )
      ),
    ]);
    return result;
  } catch {
    return null;
  }
}

async function redisSetWithTimeout(
  key: string,
  value: string,
  ex: number
): Promise<void> {
  if (!redis) return;
  try {
    await Promise.race([
      redis.set(key, value, { ex }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Upstash Redis timeout")),
          UPSTASH_TIMEOUT_MS
        )
      ),
    ]);
  } catch {
    // Silently fail — cache is non-critical
  }
}

async function redisDelWithTimeout(...keys: string[]): Promise<void> {
  if (!redis) return;
  try {
    await Promise.race([
      redis.del(...keys),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Upstash Redis timeout")),
          UPSTASH_TIMEOUT_MS
        )
      ),
    ]);
  } catch {
    // Silently fail
  }
}

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
  role: Role
): Promise<RoleConfigCacheValue> {
  const fallback = DEFAULT_ROLE_CONFIG[role];

  if (!redis) return fallback;

  const key = roleCacheKey(role);
  const cached = await redisGetWithTimeout<string>(key);
  if (cached) {
    try {
      return JSON.parse(cached) as RoleConfigCacheValue;
    } catch {
      // ignore
    }
  }

  // Source of truth: Prisma — relation normalisée RolePermission → Permission.
  // Le champ déprécié RoleConfig.permissions (JSON) n'est plus lu.
  try {
    const dbConfig = await prisma.roleConfig.findFirst({
      where: { role, isActive: true },
      select: {
        rolePermissions: { select: { permission: { select: { code: true } } } },
        restrictions: true,
      },
    });

    const granted = new Set(
      (dbConfig?.rolePermissions ?? []).map((rp) => rp.permission.code),
    );

    const value: RoleConfigCacheValue = {
      level: fallback.level,
      permissions: Object.fromEntries(
        Object.entries(
          fallback.permissions as Record<Permission, "ON" | "OFF">,
        ).map(([code, state]) => [code, granted.has(code) ? "ON" : state]),
      ) as Record<Permission, "ON" | "OFF">,
      restrictions: {
        ...(fallback.restrictions as Record<
          Restriction,
          string | "ON" | "OFF"
        >),
        ...((dbConfig?.restrictions ?? {}) as Record<
          Restriction,
          string | "ON" | "OFF"
        >),
      },
    };

    await redisSetWithTimeout(key, JSON.stringify(value), TTL_SECONDS);
    return value;
  } catch {
    return fallback;
  }
}

export async function invalidateRoleCache(role?: Role) {
  if (!redis) return;

  if (role) {
    await redisDelWithTimeout(
      roleCacheKey(role),
      permsCacheKey(role),
      restrCacheKey(role)
    );
    return;
  }

  // Best-effort: delete all known roles.
  for (const r of Object.values(ROLES) as Role[]) {
    await redisDelWithTimeout(
      roleCacheKey(r),
      permsCacheKey(r),
      restrCacheKey(r)
    );
  }
}

export async function getEffectivePermissionsCached(
  role: Role,
  compute: () => Promise<Set<Permission>>
): Promise<Set<Permission>> {
  if (!redis) return compute();

  const key = permsCacheKey(role);
  const cached = await redisGetWithTimeout<string>(key);
  if (cached) {
    try {
      const arr = JSON.parse(cached) as Permission[];
      return new Set(arr);
    } catch {
      // ignore
    }
  }

  const perms = await compute();
  await redisSetWithTimeout(
    key,
    JSON.stringify(Array.from(perms)),
    TTL_SECONDS
  );
  return perms;
}

export async function getEffectiveRestrictionsCached(
  role: Role,
  compute: () => Promise<Map<Restriction, string | "ON" | "OFF">>
): Promise<Map<Restriction, string | "ON" | "OFF">> {
  if (!redis) {
    return compute();
  }

  const key = restrCacheKey(role);
  const cached = await redisGetWithTimeout<string>(key);
  if (cached) {
    try {
      const obj = JSON.parse(cached) as Record<
        Restriction,
        string | "ON" | "OFF"
      >;
      return new Map(
        Object.entries(obj) as [Restriction, string | "ON" | "OFF"][]
      );
    } catch {
      // ignore
    }
  }

  const restrMap = await compute();

  const obj = Object.fromEntries(restrMap.entries()) as Record<
    Restriction,
    string | "ON" | "OFF"
  >;
  await redisSetWithTimeout(key, JSON.stringify(obj), TTL_SECONDS);
  return restrMap;
}
