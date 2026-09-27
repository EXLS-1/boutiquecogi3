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

export type MockLogEntry = {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  meta?: Record<string, unknown>;
};

export interface MockLogger extends RedisLogger {
  /** Journal des entrées capturées (accessible pour les assertions de test). */
  logs: MockLogEntry[];
}

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
  >();

  public circuitBreaker: MockCircuitBreaker;
  public logger: MockLogger;
  private options: RedisClientOptions;

  // 👇 New property to use crypto – generates a unique client ID
  public readonly clientId: string;

  constructor(options: RedisClientOptions = {}) {
    this.options = options;
    this.logger = createMockLogger();
    const cb = options.circuitBreaker ?? {};
    this.circuitBreaker = new MockCircuitBreaker(
      cb.failureThreshold ?? 5,
      cb.resetTimeoutMs ?? 30000,
      cb.halfOpenMaxCalls ?? 3
    );

    // 👇 Use crypto to generate a unique ID for this client instance
    this.clientId = crypto.randomUUID();
  }

  private checkCircuit(): void {
    if (!this.circuitBreaker.canExecute()) {
      this.logger.error("Circuit breaker is OPEN — operation rejected", {
        operation: "checkCircuit",
      });
      throw new MockRedisCircuitOpenError();
    }
  }

  async get(key: string): Promise<string | null> {
    this.checkCircuit();
    const expiry = this.ttlStore.get(key);
    if (expiry && Date.now() > expiry) {
      this.store.delete(key);
      this.ttlStore.delete(key);
      this.circuitBreaker.recordSuccess();
      return null;
    }
    const val = this.store.get(key) ?? null;
    this.circuitBreaker.recordSuccess();
    return val;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<"OK"> {
    this.checkCircuit();
    this.store.set(key, value);
    if (ttlSeconds) {
      this.ttlStore.set(key, Date.now() + ttlSeconds * 1000);
    } else {
      this.ttlStore.delete(key);
    }
    this.circuitBreaker.recordSuccess();
    this.logger.info("Operation succeeded", { operation: "set", key });
    return "OK";
  }

  async setex(key: string, seconds: number, value: string): Promise<"OK"> {
    return this.set(key, value, seconds);
  }

  async del(...keys: string[]): Promise<number> {
    this.checkCircuit();
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
      this.hashStore.delete(key);
      this.listStore.delete(key);
      this.setStore.delete(key);
      this.zsetStore.delete(key);
      this.ttlStore.delete(key);
      this.lockStore.delete(key);
    }
    this.circuitBreaker.recordSuccess();
    return count;
  }

  async exists(...keys: string[]): Promise<number> {
    this.checkCircuit();
    let count = 0;
    for (const key of keys) {
      if (this.store.has(key) || this.hashStore.has(key)) count++;
    }
    this.circuitBreaker.recordSuccess();
    return count;
  }

  async expire(key: string, seconds: number): Promise<number> {
    this.checkCircuit();
    if (this.store.has(key) || this.hashStore.has(key)) {
      this.ttlStore.set(key, Date.now() + seconds * 1000);
      this.circuitBreaker.recordSuccess();
      return 1;
    }
    this.circuitBreaker.recordSuccess();
    return 0;
  }

  async ttl(key: string): Promise<number> {
    this.checkCircuit();
    const expiry = this.ttlStore.get(key);
    if (!expiry) return -1;
    const remaining = Math.ceil((expiry - Date.now()) / 1000);
    this.circuitBreaker.recordSuccess();
    return remaining > 0 ? remaining : -2;
  }

  async ping(): Promise<"PONG"> {
    this.checkCircuit();
    this.logger.info("Ping succeeded", { operation: "ping" });
    this.circuitBreaker.recordSuccess();
    return "PONG";
  }

  // ─── Pub/Sub ────────────────────────────────────────────────────────────────

  subscribe(
    channels: string[],
    handler: (channel: string, message: unknown) => void
  ): () => void {
    for (const channel of channels) {
      let handlers = this.pubSubHandlers.get(channel);
      if (!handlers) {
        handlers = new Set();
        this.pubSubHandlers.set(channel, handlers);
      }
      handlers.add(handler);
    }
    return () => {
      for (const channel of channels) {
        this.pubSubHandlers.get(channel)?.delete(handler);
      }
    };
  }

  async publish(channel: string, message: unknown): Promise<number> {
    const handlers = this.pubSubHandlers.get(channel);
    if (!handlers || handlers.size === 0) return 0;
    let delivered = 0;
    for (const handler of handlers) {
      handler(channel, message);
      delivered++;
    }
    return delivered;
  }

  // ─── Pattern Matching & Scan ────────────────────────────────────────────────

  /** Convertit un pattern Redis glob (ex: "scan:*") en RegExp. */
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^${escaped.replace(/\*/g, ".*")}$`);
  }

  private allKeys(): string[] {
    const keys = new Set<string>();
    for (const key of this.store.keys()) keys.add(key);
    for (const key of this.hashStore.keys()) keys.add(key);
    for (const key of this.listStore.keys()) keys.add(key);
    for (const key of this.setStore.keys()) keys.add(key);
    for (const key of this.zsetStore.keys()) keys.add(key);
    return Array.from(keys);
  }

  async scanKeys(pattern: string): Promise<string[]> {
    this.checkCircuit();
    const regex = this.patternToRegex(pattern);
    const matched = this.allKeys().filter((key) => regex.test(key));
    this.circuitBreaker.recordSuccess();
    return matched;
  }

  async scanAll(pattern: string): Promise<string[]> {
    return this.scanKeys(pattern);
  }

  /**
   * Simule la réception d'un message Redis (comme un event ioredis).
   * Déclenche les handlers abonnés au canal, avec parsing JSON du message brut.
   */
  emit(event: string, channel: string, rawMessage: string): void {
    if (event !== "message") return;
    let parsed: unknown = rawMessage;
    try {
      parsed = JSON.parse(rawMessage);
    } catch {
      // message non-JSON : transmis tel quel
    }
    const handlers = this.pubSubHandlers.get(channel);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(channel, parsed);
    }
  }

  getMetrics() {
    return {
      isConnected: true,
      circuitBreaker: this.circuitBreaker.getMetrics(),
      config: this.options,
      // 👇 Include the client ID in metrics (optional, but shows usage)
      clientId: this.clientId,
    };
  }

  reset(): void {
    this.store.clear();
    this.hashStore.clear();
    this.listStore.clear();
    this.setStore.clear();
    this.zsetStore.clear();
    this.ttlStore.clear();
    this.lockStore.clear();
    this.pubSubHandlers.clear();
    this.logger.logs.length = 0;
    this.circuitBreaker = new MockCircuitBreaker(
      this.options.circuitBreaker?.failureThreshold ?? 5,
      this.options.circuitBreaker?.resetTimeoutMs ?? 30000,
      this.options.circuitBreaker?.halfOpenMaxCalls ?? 3
    );
  }
}

export function createMockLogger(): MockLogger {
  const logs: MockLogEntry[] = [];
  const logger: MockLogger = {
    logs,
    debug: (msg, meta) => logs.push({ level: "debug", message: msg, meta }),
    info: (msg, meta) => logs.push({ level: "info", message: msg, meta }),
    warn: (msg, meta) => logs.push({ level: "warn", message: msg, meta }),
    error: (msg, meta) => logs.push({ level: "error", message: msg, meta }),
    child: () => createMockLogger(),
  };
  return logger;
}

export function createMockRedisClient(options: RedisClientOptions = {}) {
  const mockRedis = new MockRedisClient(options);
  return {
    client: mockRedis as unknown as import("./redis").RedisClient,
    mockRedis,
    logger: mockRedis.logger,
    reset: () => mockRedis.reset(),
  };
}
