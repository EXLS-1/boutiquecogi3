// lib/redis.mock.ts
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @fileoverview Mock Redis Client — Implémentation en mémoire pour tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Fournit des mocks complets des classes d'export de lib/redis.ts :
 *   - RedisClient
 *   - RedisClusterClient
 *   - RedisStreamManager
 *   - L1CacheManager
 *   - RedisMetricsCollector
 *   - RealtimeNotificationManager
 *   - redisHelpers (intégré)
 *   - redisAdvancedHelpers (intégré)
 *   - KeyBuilder
 *   - CircuitBreaker
 *   - Serializer
 *   - Diverses classes d'erreur
 *
 * Utilisation en test :
 *   import { mockRedisClient, mockRedis, ... } from "@/lib/redis.mock";
 *   // Remplacer getRedisClient() par mockRedisClient
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import crypto from "node:crypto";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface RedisLogger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  child: (bindings: Record<string, unknown>) => RedisLogger;
}

export interface StreamMessage {
  id: string;
  data: Record<string, string>;
}

export interface StreamConsumerGroup {
  stream: string;
  group: string;
  consumer: string;
}

export interface L1CacheConfig {
  maxSize: number;
  defaultTtlMs: number;
  enabled: boolean;
}

export interface RedisMetrics {
  timestamp: number;
  connection: {
    isConnected: boolean;
    isHealthy: boolean;
    circuitState: string;
  };
  performance: {
    totalOperations: number;
    averageLatencyMs: number;
    p99LatencyMs: number;
    errorRate: number;
  };
  memory: {
    usedMemory: number;
    usedMemoryHuman: string;
    keyCount: number;
  };
  throughput: {
    opsPerSecond: number;
    connectedClients: number;
    blockedClients: number;
  };
}

export interface NotificationPayload {
  type: string;
  payload: unknown;
  timestamp: number;
  sender?: string;
}

export interface RoomSubscription {
  room: string;
  userId: string;
  handler: (notification: NotificationPayload) => void;
}

export interface RedisClientOptions {
  config?: Record<string, unknown>;
  circuitBreaker?: {
    failureThreshold?: number;
    resetTimeoutMs?: number;
    halfOpenMaxCalls?: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SILENT LOGGER
// ═══════════════════════════════════════════════════════════════════════════════

export const silentLogger: RedisLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => silentLogger,
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK CIRCUIT BREAKER
// ═══════════════════════════════════════════════════════════════════════════════

export class MockCircuitBreaker {
  state: CircuitState = "CLOSED";
  failureCount = 0;
  lastFailureTime: number | null = null;
  halfOpenCalls = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxCalls: number;

  constructor(
    failureThreshold = 5,
    resetTimeoutMs = 30000,
    halfOpenMaxCalls = 3
  ) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.halfOpenMaxCalls = halfOpenMaxCalls;
  }

  canExecute(): boolean {
    if (this.state === "CLOSED") return true;
    if (this.state === "OPEN") {
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime >= this.resetTimeoutMs
      ) {
        this.state = "HALF_OPEN";
        this.halfOpenCalls = 0;
        return true;
      }
      return false;
    }
    return this.halfOpenCalls < this.halfOpenMaxCalls;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.lastFailureTime = null;
    if (this.state === "HALF_OPEN") {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= this.halfOpenMaxCalls) {
        this.state = "CLOSED";
        this.halfOpenCalls = 0;
      }
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (
      this.state === "HALF_OPEN" ||
      this.failureCount >= this.failureThreshold
    ) {
      this.state = "OPEN";
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

export class MockRedisError extends Error {
  code: string;
  cause?: unknown;
  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.name = "MockRedisError";
    this.code = code;
    this.cause = cause;
  }
}

export class MockRedisConnectionError extends MockRedisError {
  constructor(message: string, cause?: unknown) {
    super(message, "REDIS_CONNECTION_ERROR", cause);
    this.name = "MockRedisConnectionError";
  }
}

export class MockRedisCircuitOpenError extends MockRedisError {
  constructor(message = "Circuit breaker is OPEN") {
    super(message, "REDIS_CIRCUIT_OPEN");
    this.name = "MockRedisCircuitOpenError";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK SERIALIZER
// ═══════════════════════════════════════════════════════════════════════════════

export class MockSerializer {
  static serialize<T>(value: T): string {
    return JSON.stringify(value);
  }

  static deserialize<T>(value: string | null): T | null {
    if (value === null) return null;
    return JSON.parse(value) as T;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK KEY BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export const MockRedisNamespaces = {
  SESSION: "session",
  USER: "user",
  CART: "cart",
  PRODUCT: "product",
  CATEGORY: "category",
  ORDER: "order",
  INVENTORY: "inventory",
  RATE_LIMIT: "ratelimit",
  CACHE: "cache",
  LOCK: "lock",
  RBAC: "rbac",
  FEATURE_FLAG: "feature",
  ANALYTICS: "analytics",
  WEBHOOK: "webhook",
  OAUTH_STATE: "oauth:state",
  EMAIL_VERIFICATION: "email:verify",
  PASSWORD_RESET: "password:reset",
  MAGIC_LINK: "magic:link",
  CINETPAY: "cinetpay",
  SEARCH: "search",
  RECOMMENDATION: "rec",
} as const;

type MockNamespace =
  (typeof MockRedisNamespaces)[keyof typeof MockRedisNamespaces];

export class MockKeyBuilder {
  private readonly prefix: string;

  constructor(prefix = "test:") {
    this.prefix = prefix;
  }

  build(
    namespace: MockNamespace,
    ...segments: (string | number)[]
  ): string {
    const sanitized = segments.map((s) => String(s).replace(/[:\s]/g, "_"));
    return `${this.prefix}${namespace}:${sanitized.join(":")}`;
  }

  pattern(namespace: MockNamespace, ...wildcards: string[]): string {
    return `${this.prefix}${namespace}:${wildcards.join(":")}`;
  }

  all(namespace: MockNamespace): string {
    return `${this.prefix}${namespace}:*`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK REDIS CLIENT — Implémentation complète en mémoire
// ═══════════════════════════════════════════════════════════════════════════════

export class MockRedisClient {
  private store = new Map<string, string>();
  private hashStore = new Map<string, Map<string, string>>();
  private listStore = new Map<string, string[]>();
  private setStore = new Map<string, Set<string>>();
  private zsetStore = new Map<string, Map<string, number>>();
  private ttlStore = new Map<string, number>();
  private lockStore = new Map<string, { token: string; expiresAt: number }>();
  private pubSubHandlers = new Map<
    string,
    Set<(channel: string, message: unknown) => void>
  >
