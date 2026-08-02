// lib/security/rate-limits.ts
/**
 * =============================================================================
 * BOUTIQUECOGI3 — RATE LIMITING SYSTEM
 * =============================================================================
 * 
 * Architecture: Modular, Atomic, Performance-Optimized
 * Stack: Upstash Redis + @upstash/ratelimit + Sliding Window + Burst Control
 * RBAC Integration: Level 1-6 + GUEST (unauthenticated)
 * 
 * LEVEL 1 = SUPER-ADMIN  |  LEVEL 2 = ADMIN
 * LEVEL 3 = MANAGER      |  LEVEL 4 = EDITOR
 * LEVEL 5 = SUPERVISOR   |  LEVEL 6 = USER
 * GUEST = Unauthenticated public sessions
 * =============================================================================
 */

import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const hasUpstashRedis =
  !!UPSTASH_REDIS_REST_URL && !!UPSTASH_REDIS_REST_TOKEN;

if (!hasUpstashRedis) {
  console.warn(
    "[RATE-LIMIT] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN manquants. " +
      "Utilisation du fallback In-Memory (non partagé entre instances)."
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REDIS CLIENT SINGLETON (Atomic Pattern)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Singleton Redis client instance (Upstash).
 * Non-null uniquement si UPSTASH_REDIS_REST_URL / TOKEN sont configurés.
 */
const redisClient: Redis | null = hasUpstashRedis
  ? new Redis({
      url: UPSTASH_REDIS_REST_URL!,
      token: UPSTASH_REDIS_REST_TOKEN!,
      retry: {
        retries: 3,
        backoff: (retryCount) => Math.min(retryCount * 100, 1000),
      },
      cache: "no-store", // Disable fetch cache for real-time rate limiting
    })
  : null;

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY RATE LIMITER (Fallback sans Upstash Redis)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse une durée courte ("10s", "5m", "1h", "1d") en millisecondes.
 */
function parseWindowToMs(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/);
  if (!match) return 60_000;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "s":
      return value * 1_000;
    case "m":
      return value * 60_000;
    case "h":
      return value * 3_600_000;
    case "d":
      return value * 86_400_000;
    default:
      return 60_000;
  }
}

interface RateLimitCheckResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Rate limiter sliding-window stocké en mémoire (process-local).
 * Utilisé uniquement en développement / absence d'Upstash Redis.
 * ⚠️ N'est PAS partagé entre plusieurs instances serverless.
 */
class InMemoryRatelimit {
  private readonly windowMs: number;
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly maxRequests: number,
    window: string,
    private readonly prefix: string
  ) {
    this.windowMs = parseWindowToMs(window);
  }

  async limit(identifier: string): Promise<RateLimitCheckResult> {
    const now = Date.now();
    const key = `${this.prefix}:${identifier}`;
    const windowStart = now - this.windowMs;

    const timestamps = (this.hits.get(key) ?? []).filter(
      (t) => t > windowStart
    );

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0] ?? now;
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: oldest + this.windowMs,
      };
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);

    // Nettoyage opportuniste pour éviter une croissance mémoire illimitée
    if (this.hits.size > 10_000) {
      for (const [k, v] of this.hits) {
        const filtered = v.filter((t) => t > now - this.windowMs);
        if (filtered.length === 0) this.hits.delete(k);
        else this.hits.set(k, filtered);
      }
    }

    return {
      success: true,
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - timestamps.length),
      reset: now + this.windowMs,
    };
  }
}

type AnyRatelimit = Ratelimit | InMemoryRatelimit;

/**
 * Optional per-route rate limit override.
 * Any field present replaces the default RBAC tier for that layer.
 */
export interface RateLimitOverride {
  standard?: { requests: number; window: Duration };
  burst?: { requests: number; window: Duration };
}

// ─────────────────────────────────────────────────────────────────────────────
// RBAC RATE LIMIT CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rate limit tiers aligned with RBAC hierarchy.
 * Higher privilege = higher rate limits + burst capacity.
 * 
 * Format: [requests, windowDuration]
 * Window durations use Upstash shorthand: "1s", "10s", "1m", "1h", "1d"
 */
const RBAC_RATE_LIMITS = {
  // LEVEL 1: SUPER-ADMIN — Maximum privileges, highest throughput
  SUPER_ADMIN: {
    standard: { requests: 500, window: "1m" as const },
    burst: { requests: 100, window: "10s" as const }, // Burst capacity
  },
  // LEVEL 2: ADMIN — High privileges, elevated throughput
  ADMIN: {
    standard: { requests: 300, window: "1m" as const },
    burst: { requests: 60, window: "10s" as const },
  },
  // LEVEL 3: MANAGER — Management operations, moderate-high throughput
  MANAGER: {
    standard: { requests: 200, window: "1m" as const },
    burst: { requests: 40, window: "10s" as const },
  },
  // LEVEL 4: EDITOR — Content operations, moderate throughput
  EDITOR: {
    standard: { requests: 120, window: "1m" as const },
    burst: { requests: 25, window: "10s" as const },
  },
  // LEVEL 5: SUPERVISOR — Oversight operations, moderate throughput
  SUPERVISOR: {
    standard: { requests: 100, window: "1m" as const },
    burst: { requests: 20, window: "10s" as const },
  },
  // LEVEL 6: USER — Standard user, normal throughput
  USER: {
    standard: { requests: 60, window: "1m" as const },
    burst: { requests: 15, window: "10s" as const },
  },
  // GUEST: Unauthenticated public — Strictly limited, minimal privileges
  GUEST: {
    standard: { requests: 15, window: "1m" as const },
    burst: { requests: 5, window: "10s" as const },
  },
} as const;

type RBACLevel = keyof typeof RBAC_RATE_LIMITS;

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITER FACTORY (Modular Pattern)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rate limiter registry to prevent duplicate instantiations.
 * Keyed by RBAC level + algorithm type.
 */
const rateLimiterRegistry = new Map<string, AnyRatelimit>();

/**
 * Creates or retrieves a cached rate limiter instance.
 * Utilise Upstash Redis si configuré, sinon fallback In-Memory.
 * Un override optionnel remplace le tier RBAC par défaut pour la couche demandée.
 */
function getRateLimiter(
  level: RBACLevel,
  type: "standard" | "burst" = "standard",
  override?: RateLimitOverride[typeof type]
): AnyRatelimit {
  // Include the override in the registry key so different limits never share
  // a cached limiter instance.
  const overrideKey = override
    ? `:${override.requests}:${override.window}`
    : "";
  const cacheKey = `${level}:${type}${overrideKey}`;
  
  if (rateLimiterRegistry.has(cacheKey)) {
    return rateLimiterRegistry.get(cacheKey)!;
  }

  // Merge: per-route override wins, RBAC tier is the fallback
  const baseConfig = RBAC_RATE_LIMITS[level][type];
  const config = {
    requests: override?.requests ?? baseConfig.requests,
    window: override?.window ?? baseConfig.window,
  };

  let limiter: AnyRatelimit;

  if (redisClient) {
    limiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(config.requests, config.window),
      prefix: `ratelimit:${level.toLowerCase()}:${type}`,
      analytics: true, // Enable analytics for monitoring
      // Ephemeral cache disabled for dynamic limit consistency
      // across serverless function invocations
    });
  } else {
    limiter = new InMemoryRatelimit(
      config.requests,
      config.window,
      `ratelimit:${level.toLowerCase()}:${type}`
    );
  }

  rateLimiterRegistry.set(cacheKey, limiter);
  return limiter;
}

// ─────────────────────────────────────────────────────────────────────────────
// IDENTIFIER RESOLUTION (Security-Critical)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves a unique identifier for rate limiting.
 * Priority: Authenticated User ID > API Key > IP Address > Fingerprint
 * 
 * Security: Prevents identifier spoofing and ensures accountability.
 */
async function resolveIdentifier(
  request: NextRequest,
  userId?: string,
  apiKey?: string
): Promise<string> {
  // Priority 1: Authenticated user ID (most reliable)
  if (userId) {
    return `user:${userId}`;
  }

  // Priority 2: API Key (for service-to-service communication)
  if (apiKey) {
    return `api:${apiKey}`;
  }

  // Priority 3: IP Address with User-Agent fingerprint
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const userAgent = headersList.get("user-agent") || "unknown";
  
  // Extract IP with fallback chain
  const ip = forwardedFor?.split(",")[0]?.trim() 
    || realIp 
    || "unknown";

  // Create a fingerprint combining IP + User-Agent hash
  // This prevents simple IP rotation bypasses
  const fingerprint = await hashFingerprint(`${ip}:${userAgent}`);
  
  return `guest:${ip}:${fingerprint}`;
}

/**
 * Simple deterministic hash for fingerprinting.
 * Uses Web Crypto API for performance and security.
 */
async function hashFingerprint(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Return first 8 chars for key brevity (sufficient entropy for rate limiting)
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 8);
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE RATE LIMITING API
// ─────────────────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
  identifier: string;
  level: RBACLevel;
  isBurst: boolean;
}

/**
 * Main rate limiting function with dual-layer protection.
 * 
 * Layer 1: Standard sliding window (primary rate limit)
 * Layer 2: Burst control (prevents traffic spikes)
 * 
 * Both layers must pass for the request to succeed.
 */
export async function checkRateLimit(
  request: NextRequest,
  options: {
    userId?: string;
    apiKey?: string;
    level?: RBACLevel;
    skipBurst?: boolean; // Allow bypassing burst check for specific endpoints
    overrides?: RateLimitOverride; // Per-route overrides for standard/burst layers
  } = {}
): Promise<RateLimitResult> {
  const {
    userId,
    apiKey,
    level = "GUEST",
    skipBurst = false,
    overrides,
  } = options;

  // Resolve unique identifier
  const identifier = await resolveIdentifier(request, userId, apiKey);

  // ── Layer 1: Standard Sliding Window ──
  const standardLimiter = getRateLimiter(level, "standard", overrides?.standard);
  const standardResult = await standardLimiter.limit(identifier);

  if (!standardResult.success) {
    return {
      success: false,
      limit: standardResult.limit,
      remaining: standardResult.remaining,
      reset: standardResult.reset,
      retryAfter: Math.ceil((standardResult.reset - Date.now()) / 1000),
      identifier,
      level,
      isBurst: false,
    };
  }

  // ── Layer 2: Burst Control (unless skipped) ──
  if (!skipBurst) {
    const burstLimiter = getRateLimiter(level, "burst", overrides?.burst);
    const burstResult = await burstLimiter.limit(identifier);

    if (!burstResult.success) {
      return {
        success: false,
        limit: burstResult.limit,
        remaining: burstResult.remaining,
        reset: burstResult.reset,
        retryAfter: Math.ceil((burstResult.reset - Date.now()) / 1000),
        identifier,
        level,
        isBurst: true,
      };
    }
  }

  return {
    success: true,
    limit: standardResult.limit,
    remaining: standardResult.remaining,
    reset: standardResult.reset,
    retryAfter: 0,
    identifier,
    level,
    isBurst: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Path-specific rate limit overrides.
 * Applied in `middlewareRateLimit` for stricter limits on sensitive endpoints.
 * Key must match an exact API path; `middlewareRateLimit` also supports
 * prefix matching so that e.g. "/api/admin" covers "/api/admin/users".
 */
const PATH_RATE_LIMIT_OVERRIDES: Record<string, RateLimitOverride> = {
  "/api/auth/sign-in": { standard: { requests: 5, window: "5m" } },
  "/api/auth/sign-up": { standard: { requests: 3, window: "10m" } },
  "/api/auth/forgot-password": { standard: { requests: 3, window: "15m" } },
  "/api/checkout": { standard: { requests: 10, window: "1m" } },
  "/api/admin": { standard: { requests: 100, window: "1m" } },
};

/**
 * Resolves the closest matching override for a request path.
 * Exact match wins; otherwise the longest registered prefix is used.
 */
function resolvePathOverride(path?: string): RateLimitOverride | undefined {
  if (!path) return undefined;

  // Exact match first
  if (PATH_RATE_LIMIT_OVERRIDES[path]) {
    return PATH_RATE_LIMIT_OVERRIDES[path];
  }

  // Longest-prefix match (e.g. "/api/admin/users" → "/api/admin")
  let bestMatch: string | undefined;
  for (const key of Object.keys(PATH_RATE_LIMIT_OVERRIDES)) {
    if (
      path.startsWith(key) &&
      (!bestMatch || key.length > bestMatch.length)
    ) {
      bestMatch = key;
    }
  }

  return bestMatch ? PATH_RATE_LIMIT_OVERRIDES[bestMatch] : undefined;
}

/**
 * Next.js Middleware-compatible rate limit checker.
 * Returns a NextResponse with appropriate headers or blocks the request.
 */
export async function middlewareRateLimit(
  request: NextRequest,
  options: {
    userId?: string;
    level?: RBACLevel;
    path?: string; // Optional path for path-specific limits
  } = {}
): Promise<NextResponse | null> {
  const { userId, level = "GUEST", path } = options;

  // Resolve path-specific overrides (exact or longest-prefix match)
  const override = resolvePathOverride(path);

  // Check rate limit (overrides tighten the RBAC tier for this path)
  const result = await checkRateLimit(request, { userId, level, overrides: override });

  // Build response headers
  const responseHeaders = new Headers();
  responseHeaders.set("X-RateLimit-Limit", result.limit.toString());
  responseHeaders.set("X-RateLimit-Remaining", result.remaining.toString());
  responseHeaders.set("X-RateLimit-Reset", result.reset.toString());
  responseHeaders.set("X-RateLimit-Policy", `${level}:${result.isBurst ? "burst" : "standard"}`);

  if (!result.success) {
    responseHeaders.set("Retry-After", result.retryAfter.toString());
    
    return new NextResponse(
      JSON.stringify({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Retry after ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
        limit: result.limit,
        isBurst: result.isBurst,
      }),
      {
        status: 429,
        headers: {
          ...Object.fromEntries(responseHeaders),
          "Content-Type": "application/json",
        },
      }
    );
  }

  return null; // Allow request to proceed
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTION INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rate limit checker optimized for Server Actions.
 * Uses IP + User-Agent fingerprinting for unauthenticated users.
 */
export async function serverActionRateLimit(
  options: {
    userId?: string;
    level?: RBACLevel;
    actionName?: string; // For action-specific logging
  } = {}
): Promise<RateLimitResult> {
  const { userId, level = "GUEST", actionName } = options;

  // Construct a minimal request object for identifier resolution
  const headersList = await headers();
  const request = new NextRequest("http://localhost", {
    headers: Object.fromEntries(headersList.entries()),
  });

  const result = await checkRateLimit(request, { userId, level });

  // Log rate limit checks for security audit (non-blocking)
  if (!result.success) {
    console.warn(
      `[RATE-LIMIT] BLOCKED | Level: ${level} | Action: ${actionName || "unknown"} | ID: ${result.identifier} | RetryAfter: ${result.retryAfter}s`
    );
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC LIMIT MANAGEMENT (Runtime Adjustment)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dynamically adjusts rate limits at runtime.
 * Useful for traffic spikes, sales events, or emergency lockdowns.
 * 
 * WARNING: Disables ephemeral cache. Use sparingly.
 */
export async function setDynamicLimit(
  level: RBACLevel,
  type: "standard" | "burst",
  newLimit: number | false
): Promise<void> {
  const limiter = getRateLimiter(level, type);

  // L'API dynamique n'existe que sur l'implémentation Upstash Ratelimit.
  // Vérification à l'exécution pour éviter les erreurs de type.
  if (limiter instanceof Ratelimit) {
    const dynamicLimiter = limiter as Ratelimit & {
      setDynamicLimit: (opts: { limit: number | false }) => Promise<void>;
    };
    if (typeof dynamicLimiter.setDynamicLimit === "function") {
      await dynamicLimiter.setDynamicLimit({ limit: newLimit });
      return;
    }
  }

  // Fallback: Log warning if SDK version doesn't support dynamic limits
  console.warn(
    `[RATE-LIMIT] Dynamic limits not available for ${level}:${type}. ` +
      `Consider upgrading @upstash/ratelimit.`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS & MONITORING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieves rate limit analytics for monitoring dashboards.
 */
export async function getRateLimitAnalytics(
  level: RBACLevel,
  type: "standard" | "burst" = "standard"
): Promise<{
  totalRequests: number;
  blockedRequests: number;
  passRate: number;
  averageLatency: number;
} | null> {
  try {
    if (!redisClient) return null;
    const prefix = `ratelimit:${level.toLowerCase()}:${type}:analytics`;
    const analytics = await redisClient.get<{
      totalRequests: number;
      blockedRequests: number;
      passRate: number;
      averageLatency: number;
    }>(prefix);
    
    return analytics;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export { redisClient, RBAC_RATE_LIMITS, type RBACLevel };
export { getRateLimiter, resolveIdentifier };


/** 
 * Ce fichier implémente un système de limitation de débit à double couche :
 * 
 * 1. Fenêtre glissante (Sliding Window) : 
 *    - Calcule précisément le nombre de requêtes sur la période définie (ex: 15 min). 
 *    - Idéal pour lisser le trafic et prévenir les abus constants. 
 * 
 * 2. Contrôle de rafale (Burst Control) : 
 *    - Fixe un seuil maximum de requêtes autorisées par intervalle de temps fixe (ex: 1s).
 *    - Bloque instantanément les pics de trafic massifs (ex: attaque DDoS, scraping intense).
 * 
 * Double couche de protection : assure une expérience utilisateur fluide tout en bloquant les comportements malveillants.
 * 
 */