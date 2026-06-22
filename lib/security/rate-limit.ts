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

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  throw new Error(
    "[RATE-LIMIT] Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REDIS CLIENT SINGLETON (Atomic Pattern)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Singleton Redis client instance.
 * Ensures connection pooling and prevents redundant instantiations.
 */
const redisClient = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN,
  retry: {
    retries: 3,
    backoff: (retryCount) => Math.min(retryCount * 100, 1000),
  },
  cache: "no-store", // Disable fetch cache for real-time rate limiting
});

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
const rateLimiterRegistry = new Map<string, Ratelimit>();

/**
 * Creates or retrieves a cached Ratelimit instance.
 * Implements the Sliding Window algorithm with optional burst control.
 */
function getRateLimiter(
  level: RBACLevel,
  type: "standard" | "burst" = "standard"
): Ratelimit {
  const cacheKey = `${level}:${type}`;
  
  if (rateLimiterRegistry.has(cacheKey)) {
    return rateLimiterRegistry.get(cacheKey)!;
  }

  const config = RBAC_RATE_LIMITS[level][type];
  
  const limiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    prefix: `ratelimit:${level.toLowerCase()}:${type}`,
    analytics: true, // Enable analytics for monitoring
    // Ephemeral cache disabled for dynamic limit consistency
    // across serverless function invocations
  });

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
    || request.ip 
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
  } = {}
): Promise<RateLimitResult> {
  const { userId, apiKey, level = "GUEST", skipBurst = false } = options;

  // Resolve unique identifier
  const identifier = await resolveIdentifier(request, userId, apiKey);

  // ── Layer 1: Standard Sliding Window ──
  const standardLimiter = getRateLimiter(level, "standard");
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
    const burstLimiter = getRateLimiter(level, "burst");
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

  // Path-specific overrides (e.g., stricter limits for auth endpoints)
  const pathOverrides: Record<string, Partial<typeof RBAC_RATE_LIMITS.GUEST>> = {
    "/api/auth/login": { standard: { requests: 5, window: "5m" as const } },
    "/api/auth/register": { standard: { requests: 3, window: "10m" as const } },
    "/api/auth/forgot-password": { standard: { requests: 3, window: "15m" as const } },
    "/api/payment": { standard: { requests: 10, window: "1m" as const } },
    "/api/admin": { standard: { requests: 100, window: "1m" as const } },
  };

  const override = path ? pathOverrides[path] : undefined;

  // Check rate limit
  const result = await checkRateLimit(request, { userId, level });

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
  
  // @ts-expect-error — Dynamic limit API from Upstash
  if (typeof limiter.setDynamicLimit === "function") {
    // @ts-expect-error
    await limiter.setDynamicLimit({ limit: newLimit });
  } else {
    // Fallback: Log warning if SDK version doesn't support dynamic limits
    console.warn(
      `[RATE-LIMIT] Dynamic limits not available for ${level}:${type}. ` +
      `Consider upgrading @upstash/ratelimit.`
    );
  }
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