/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @fileoverview Client Redis centralisé pour Boutiquecogi3
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ARCHITECTURE PRINCIPALE — Pattern Singleton
 * ───────────────────────────────────────────────────────────────────────────────
 * Le Pattern Singleton évite de créer une nouvelle connexion Redis à chaque
 * requête HTTP, ce qui est vital pour les performances. Sans Singleton, chaque
 * requête Next.js créerait un nouveau socket TCP, épuisant rapidement les
 * descripteurs de fichiers du système et causant des timeouts.
 *
 * Le client est instancié une seule fois par processus Node.js et réutilisé
 * par toutes les requêtes entrantes. La connexion est lazy (lazyConnect: true)
 * — elle n'est établie qu'au premier appel réel, évitant les connexions
 * inutiles lors du build statique ou des imports côté client.
 *
 * Stack: Next.js 16.2.9 | ioredis v5 | Zod | UUID v7
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Redis } from "ioredis";
import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING INTERFACE — Intégration avec le système de logging du projet
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interface abstraite pour le système de logging.
 * Compatible avec Winston, Pino, ou tout logger structuré.
 *
 * Le logger est injecté via une factory pour éviter les dépendances circulaires
 * et permettre le mocking en tests. Par défaut, fallback sur console.
 */
export interface RedisLogger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  child: (bindings: Record<string, unknown>) => RedisLogger;
}

/** Logger par défaut (fallback console) — utilisé si aucun logger externe n'est injecté */
const defaultLogger: RedisLogger = {
  debug: (msg, meta) => console.debug(`[Redis:DEBUG] ${msg}`, meta ?? ""),
  info: (msg, meta) => console.info(`[Redis:INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[Redis:WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[Redis:ERROR] ${msg}`, meta ?? ""),
  child: (bindings) => ({
    debug: (msg, meta) => defaultLogger.debug(msg, { ...bindings, ...meta }),
    info: (msg, meta) => defaultLogger.info(msg, { ...bindings, ...meta }),
    warn: (msg, meta) => defaultLogger.warn(msg, { ...bindings, ...meta }),
    error: (msg, meta) => defaultLogger.error(msg, { ...bindings, ...meta }),
    child: (b2) => defaultLogger.child({ ...bindings, ...b2 }),
  }),
};

let externalLogger: RedisLogger | null = null;

/**
 * Injecte un logger externe (Winston, Pino, etc.) dans le client Redis.
 * À appeler une fois au démarrage de l'application.
 *
 * @example
 * ```ts
 * import { setRedisLogger } from "@/lib/redis";
 * import { logger } from "@/lib/logger";
 * setRedisLogger(logger.child({ module: "redis" }));
 * ```
 */
export function setRedisLogger(logger: RedisLogger): void {
  externalLogger = logger;
}

function getLogger(): RedisLogger {
  return externalLogger ?? defaultLogger;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION & ENV — Validation Zod stricte
// ═══════════════════════════════════════════════════════════════════════════════

const RedisConfigSchema = z.object({
  host: z.string().min(1, "REDIS_HOST requis"),
  port: z.coerce.number().int().min(1).max(65535),
  password: z.string().optional(),
  db: z.coerce.number().int().min(0).max(15).default(0),
  keyPrefix: z.string().default("boutiquecogi3:"),
  maxRetriesPerRequest: z.coerce.number().int().min(0).default(3),
  enableReadyCheck: z.boolean().default(true),
  enableOfflineQueue: z.boolean().default(true),
  lazyConnect: z.boolean().default(true),
  connectTimeout: z.coerce.number().int().min(1000).default(10000),
  commandTimeout: z.coerce.number().int().min(1000).default(5000),
  keepAlive: z.coerce.number().int().min(0).default(30000),
  family: z.coerce.number().int().min(4).max(6).default(4),
  tls: z.boolean().default(false),
  enableAutoPipelining: z.boolean().default(false),
});

type RedisConfig = z.infer<typeof RedisConfigSchema>;

const DEFAULT_CONFIG: RedisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0", 10),
  keyPrefix: process.env.REDIS_KEY_PREFIX || "boutiquecogi3:",
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || "3", 10),
  enableReadyCheck: process.env.REDIS_ENABLE_READY_CHECK !== "false",
  enableOfflineQueue: process.env.REDIS_ENABLE_OFFLINE_QUEUE !== "false",
  lazyConnect: true,
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || "10000", 10),
  commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || "5000", 10),
  keepAlive: parseInt(process.env.REDIS_KEEP_ALIVE || "30000", 10),
  family: parseInt(process.env.REDIS_FAMILY || "4", 10),
  tls: process.env.REDIS_TLS === "true",
  enableAutoPipelining: process.env.REDIS_ENABLE_AUTO_PIPELINING === "true",
};

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER — Protection contre les cascades d'erreurs
// ═══════════════════════════════════════════════════════════════════════════════

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxCalls: number;
  private halfOpenCalls = 0;

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
        getLogger().info("Circuit breaker transitioning OPEN -> HALF_OPEN");
        return true;
      }
      return false;
    }
    return this.halfOpenCalls < this.halfOpenMaxCalls;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    if (this.state === "HALF_OPEN") {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= this.halfOpenMaxCalls) {
        this.state = "CLOSED";
        this.halfOpenCalls = 0;
        getLogger().info("Circuit breaker transitioning HALF_OPEN -> CLOSED");
      }
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.state === "HALF_OPEN" || this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      getLogger().warn("Circuit breaker transitioning -> OPEN", {
        failureCount: this.failureCount,
        threshold: this.failureThreshold,
      });
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
// ERRORS — Hiérarchie typée pour un debugging précis
// ═══════════════════════════════════════════════════════════════════════════════

export class RedisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "RedisError";
    Object.setPrototypeOf(this, RedisError.prototype);
  }
}

export class RedisConnectionError extends RedisError {
  constructor(message: string, cause?: unknown) {
    super(message, "REDIS_CONNECTION_ERROR", cause);
    this.name = "RedisConnectionError";
  }
}

export class RedisCircuitOpenError extends RedisError {
  constructor(message = "Circuit breaker is OPEN") {
    super(message, "REDIS_CIRCUIT_OPEN");
    this.name = "RedisCircuitOpenError";
  }
}

export class RedisTimeoutError extends RedisError {
  constructor(message = "Redis command timeout", cause?: unknown) {
    super(message, "REDIS_TIMEOUT", cause);
    this.name = "RedisTimeoutError";
  }
}

export class RedisSerializationError extends RedisError {
  constructor(message: string, cause?: unknown) {
    super(message, "REDIS_SERIALIZATION_ERROR", cause);
    this.name = "RedisSerializationError";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION — JSON robuste avec métadonnées
// ═══════════════════════════════════════════════════════════════════════════════

class Serializer {
  static serialize<T>(value: T): string {
    try {
      return JSON.stringify(value);
    } catch (err) {
      throw new RedisSerializationError(
        "Failed to serialize value to JSON",
        err
      );
    }
  }

  static deserialize<T>(value: string | null): T | null {
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch (err) {
      throw new RedisSerializationError(
        "Failed to deserialize value from JSON",
        err
      );
    }
  }

  static serializeWithMetadata<T>(value: T): string {
    const serialized = this.serialize(value);
    const metadata = { v: 1, t: Date.now(), s: serialized.length };
    return `\x01${this.serialize(metadata)}\x00${serialized}`;
  }

  static deserializeWithMetadata<T>(raw: string | null): {
    data: T | null;
    meta: { v: number; t: number; s: number } | null;
  } {
    if (raw === null) return { data: null, meta: null };
    if (!raw.startsWith("\x01")) {
      return { data: this.deserialize<T>(raw), meta: null };
    }
    const parts = raw.split("\x00");
    if (parts.length < 2) {
      return { data: this.deserialize<T>(raw), meta: null };
    }
    const meta = this.deserialize<{ v: number; t: number; s: number }>(
      parts[0].slice(3)
    );
    const data = this.deserialize<T>(parts.slice(1).join("\x00"));
    return { data, meta };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEY NAMING CONVENTIONS — Namespaces stricts pour éviter les collisions
// ═══════════════════════════════════════════════════════════════════════════════

export const RedisNamespaces = {
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

type Namespace = (typeof RedisNamespaces)[keyof typeof RedisNamespaces];

export class KeyBuilder {
  private readonly prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  build(namespace: Namespace, ...segments: (string | number)[]): string {
    if (segments.length === 0) {
      throw new RedisError(
        "At least one segment is required for key building",
        "REDIS_INVALID_KEY"
      );
    }
    const sanitized = segments.map((s) =>
      String(s).replace(/[:\s]/g, "_")
    );
    return `${this.prefix}${namespace}:${sanitized.join(":")}`;
  }

  pattern(namespace: Namespace, ...wildcards: string[]): string {
    return `${this.prefix}${namespace}:${wildcards.join(":")}`;
  }

  all(namespace: Namespace): string {
    return `${this.prefix}${namespace}:*`;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN REDIS CLIENT — Singleton avec lazy connection
// ═══════════════════════════════════════════════════════════════════════════════

export interface RedisClientOptions {
  config?: Partial<RedisConfig>;
  circuitBreaker?: {
    failureThreshold?: number;
    resetTimeoutMs?: number;
    halfOpenMaxCalls?: number;
  };
}

export class RedisClient {
  private static instance: RedisClient | null = null;
  private client: Redis | null = null;
  private readonly config: RedisConfig;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly keyBuilder: KeyBuilder;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;
  private readonly logger: RedisLogger;

  private constructor(options: RedisClientOptions = {}) {
    const parsed = RedisConfigSchema.safeParse({
      ...DEFAULT_CONFIG,
      ...options.config,
    });

    if (!parsed.success) {
      throw new RedisError(
        `Invalid Redis configuration: ${parsed.error.message}`,
        "REDIS_CONFIG_ERROR"
      );
    }

    this.config = parsed.data;
    this.circuitBreaker = new CircuitBreaker(
      options.circuitBreaker?.failureThreshold,
      options.circuitBreaker?.resetTimeoutMs,
      options.circuitBreaker?.halfOpenMaxCalls
    );
    this.keyBuilder = new KeyBuilder(this.config.keyPrefix);
    this.logger = getLogger().child({ component: "RedisClient" });
  }

  /**
   * Pattern Singleton : retourne l'unique instance du client Redis.
   * Cette instance est partagée par tout le processus Node.js.
   */
  static getInstance(options?: RedisClientOptions): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient(options);
    }
    return RedisClient.instance;
  }

  static resetInstance(): void {
    if (RedisClient.instance) {
      RedisClient.instance.disconnect().catch(() => {});
      RedisClient.instance = null;
    }
  }

  // ─── Connection Management ─────────────────────────────────────────────────

  async connect(): Promise<void> {
    if (this.isConnected) return;
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = this.doConnect();
    return this.connectionPromise;
  }

  private async doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.client = new Redis({
          host: this.config.host,
          port: this.config.port,
          password: this.config.password,
          db: this.config.db,
          keyPrefix: this.config.keyPrefix,
          maxRetriesPerRequest: this.config.maxRetriesPerRequest,
          enableReadyCheck: this.config.enableReadyCheck,
          enableOfflineQueue: this.config.enableOfflineQueue,
          lazyConnect: this.config.lazyConnect,
          connectTimeout: this.config.connectTimeout,
          commandTimeout: this.config.commandTimeout,
          keepAlive: this.config.keepAlive,
          family: this.config.family,
          enableAutoPipelining: this.config.enableAutoPipelining,
          tls: this.config.tls
            ? {
                rejectUnauthorized:
                  process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false",
              }
            : undefined,
          /**
           * Gestion des erreurs — retryStrategy intégré :
           * Si Redis redémarre, votre backend ne crashera pas mais attendra
           * patiemment la reconnexion avec un délai exponentiel (max 3s).
           */
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 100, 3000);
            this.logger.warn("Redis retry attempt", {
              attempt: times,
              delayMs: delay,
            });
            return delay;
          },
          reconnectOnError: (err: Error) => {
            const retryableErrors = [
              "ECONNREFUSED",
              "ETIMEDOUT",
              "ECONNRESET",
              "EPIPE",
              "READONLY",
            ];
            const shouldRetry = retryableErrors.some((e) =>
              err.message.includes(e)
            );
            this.logger.warn("Redis reconnectOnError triggered", {
              error: err.message,
              shouldRetry,
            });
            return shouldRetry;
          },
        });

        this.client.on("connect", () => {
          this.logger.info("Connection established");
        });

        this.client.on("ready", () => {
          this.isConnected = true;
          this.connectionPromise = null;
          this.logger.info("Client ready", {
            autoPipelining: this.config.enableAutoPipelining,
          });
          resolve();
        });

        this.client.on("error", (err: Error) => {
          this.logger.error("Connection error", {
            error: err.message,
            stack: err.stack,
          });
          this.circuitBreaker.recordFailure();
          if (!this.isConnected) {
            this.connectionPromise = null;
            reject(new RedisConnectionError(err.message, err));
          }
        });

        this.client.on("close", () => {
          this.isConnected = false;
          this.logger.warn("Connection closed");
        });

        this.client.on("reconnecting", () => {
          this.logger.info("Reconnecting...");
        });

        this.client.on("end", () => {
          this.isConnected = false;
          this.logger.info("Connection ended");
        });

        if (this.config.lazyConnect) {
          this.client.connect().catch((err: Error) => {
            this.connectionPromise = null;
            reject(new RedisConnectionError(err.message, err));
          });
        }
      } catch (err) {
        this.connectionPromise = null;
        reject(new RedisConnectionError("Failed to create Redis client", err));
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      this.logger.info("Disconnected gracefully");
    }
  }

  getClient(): Redis {
    if (!this.client) {
      throw new RedisConnectionError("Redis client not initialized");
    }
    return this.client;
  }

  isHealthy(): boolean {
    return this.isConnected && this.circuitBreaker.getState() !== "OPEN";
  }

  getMetrics() {
    return {
      isConnected: this.isConnected,
      circuitBreaker: this.circuitBreaker.getMetrics(),
      config: {
        host: this.config.host,
        port: this.config.port,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
        enableAutoPipelining: this.config.enableAutoPipelining,
      },
    };
  }

  // ─── Core Operations with Circuit Breaker ──────────────────────────────────

  private async executeWithCircuit<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    if (!this.circuitBreaker.canExecute()) {
      this.logger.warn("Circuit breaker OPEN — operation rejected", {
        operation: operationName,
      });
      throw new RedisCircuitOpenError();
    }

    try {
      const start = Date.now();
      const result = await operation();
      this.circuitBreaker.recordSuccess();
      this.logger.debug("Operation succeeded", {
        operation: operationName,
        durationMs: Date.now() - start,
      });
      return result;
    } catch (err) {
      this.circuitBreaker.recordFailure();
      this.logger.error("Operation failed", {
        operation: operationName,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  // ─── String Operations ─────────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      const value = await this.client!.get(key);
      return Serializer.deserialize<T>(value);
    }, "GET");
  }

  async set<T>(
    key: string,
    value: T,
    options?: {
      ttlSeconds?: number;
      nx?: boolean;
      xx?: boolean;
      keepTtl?: boolean;
    }
  ): Promise<void> {
    await this.connect();
    const serialized = Serializer.serialize(value);

    return this.executeWithCircuit(async () => {
      const args: (string | number)[] = [key, serialized];

      if (options?.ttlSeconds) {
        args.push("EX", options.ttlSeconds);
      }
      if (options?.nx) args.push("NX");
      if (options?.xx) args.push("XX");
      if (options?.keepTtl) args.push("KEEPTTL");

      await this.client!.set(key, serialized, ...(args.slice(2) as (string | number)[]));
    }, "SET");
  }

  async setex<T>(key: string, ttlSeconds: number, value: T): Promise<void> {
    await this.connect();
    const serialized = Serializer.serialize(value);
    return this.executeWithCircuit(async () => {
      await this.client!.setex(key, ttlSeconds, serialized);
    }, "SETEX");
  }

  async del(...keys: string[]): Promise<number> {
    await this.connect();
    if (keys.length === 0) return 0;
    return this.executeWithCircuit(async () => {
      return await this.client!.del(...keys);
    }, "DEL");
  }

  async exists(...keys: string[]): Promise<number> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.exists(...keys);
    }, "EXISTS");
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      const result = await this.client!.expire(key, seconds);
      return result === 1;
    }, "EXPIRE");
  }

  async ttl(key: string): Promise<number> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.ttl(key);
    }, "TTL");
  }

  async incr(key: string): Promise<number> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.incr(key);
    }, "INCR");
  }

  async incrBy(key: string, increment: number): Promise<number> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.incrby(key, increment);
    }, "INCRBY");
  }

  async decr(key: string): Promise<number> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.decr(key);
    }, "DECR");
  }

  async decrBy(key: string, decrement: number): Promise<number> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.decrby(key, decrement);
    }, "DECRBY");
  }

  // ─── Hash Operations ───────────────────────────────────────────────────────

  async hGet<T>(key: string, field: string): Promise<T | null> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      const value = await this.client!.hget(key, field);
      return Serializer.deserialize<T>(value);
    }, "HGET");
  }

  async hGetAll<T>(key: string): Promise<Record<string, T> | null> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      const result = await this.client!.hgetall(key);
      if (Object.keys(result).length === 0) return null;
      const parsed: Record<string, T> = {};
      for (const [field, value] of Object.entries(result)) {
        parsed[field] = Serializer.deserialize<T>(value) as T;
      }
      return parsed;
    }, "HGETALL");
  }

  async hSet<T>(
    key: string,
    field: string,
    value: T,
    options?: { ttlSeconds?: number }
  ): Promise<void> {
    await this.connect();
    const serialized = Serializer.serialize(value);
    return this.executeWithCircuit(async () => {
      await this.client!.hset(key, field, serialized);
      if (options?.ttlSeconds) {
        await this.client!.expire(key, options.ttlSeconds);
      }
    }, "HSET");
  }

  async hSetMultiple<T>(
    key: string,
    fields: Record<string, T>,
    options?: { ttlSeconds?: number }
  ): Promise<void> {
    await this.connect();
    const entries: string[] = [];
    for (const [field, value] of Object.entries(fields)) {
      entries.push(field, Serializer.serialize(value));
    }
    return this.executeWithCircuit(async () => {
      await this.client!.hset(key, ...entries);
      if (options?.ttlSeconds) {
        await this.client!.expire(key, options.ttlSeconds);
      }
    }, "HSET_MULTIPLE");
  }

  async hDel(key: string, ...fields: string[]): Promise<number> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.hdel(key, ...fields);
    }, "HDEL");
  }

  async hExists(key: string, field: string): Promise<boolean> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      const result = await this.client!.hexists(key, field);
      return result === 1;
    }, "HEXISTS");
  }

  async hIncrBy(key: string, field: string, increment: number): Promise<number> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.hincrby(key, field, increment);
    }, "HINCRBY");
  }

  async hKeys(key: string): Promise<string[]> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.hkeys(key);
    }, "HKEYS");
  }

  async hLen(key: string): Promise<number> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.hlen(key);
    }, "HLEN");
  }

  // ─── List Operations ───────────────────────────────────────────────────────

  async lPush<T>(key: string, ...values: T[]): Promise<number> {
    await this.connect();
    const serialized = values.map((v) => Serializer.serialize(v));
    return this.executeWithCircuit(async () => {
      return await this.client!.lpush(key, ...serialized);
    }, "LPUSH");
  }

  async rPush<T>(key: string, ...values: T[]): Promise<number> {
    await this.connect();
    const serialized = values.map((v) => Serializer.serialize(v));
    return this.executeWithCircuit(async () => {
      return await this.client!.rpush(key, ...serialized);
    }, "RPUSH");
  }

  async lPop<T>(key: string): Promise<T | null> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      const value = await this.client!.lpop(key);
      return Serializer.deserialize<T>(value);
    }, "LPOP");
  }

  async rPop<T>(key: string): Promise<T | null> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      const value = await this.client!.rpop(key);
      return Serializer.deserialize<T>(value);
    }, "RPOP");
  }

  async lRange<T>(key: string, start: number, stop: number): Promise<T[]> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      const values = await this.client!.lrange(key, start, stop);
      return values.map((v) => Serializer.deserialize<T>(v) as T);
    }, "LRANGE");
  }

  async lTrim(key: string, start: number, stop: number): Promise<void> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      await this.client!.ltrim(key, start, stop);
    }, "LTRIM");
  }

  async lLen(key: string): Promise<number> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.llen(key);
    }, "LLEN");
  }

  // ─── Set Operations ────────────────────────────────────────────────────────

  async sAdd<T>(key: string, ...members: T[]): Promise<number> {
    await this.connect();
    const serialized = members.map((m) => Serializer.serialize(m));
    return this.executeWithCircuit(async () => {
      return await this.client!.sadd(key, ...serialized);
    }, "SADD");
  }

  async sRem<T>(key: string, ...members: T[]): Promise<number> {
    await this.connect();
    const serialized = members.map((m) => Serializer.serialize(m));
    return this.executeWithCircuit(async () => {
      return await this.client!.srem(key, ...serialized);
    }, "SREM");
  }

  async sMembers<T>(key: string): Promise<T[]> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      const members = await this.client!.smembers(key);
      return members.map((m) => Serializer.deserialize<T>(m) as T);
    }, "SMEMBERS");
  }

  async sIsMember<T>(key: string, member: T): Promise<boolean> {
    await this.connect();
    const serialized = Serializer.serialize(member);
    return this.executeWithCircuit(async () => {
      const result = await this.client!.sismember(key, serialized);
      return result === 1;
    }, "SISMEMBER");
  }

  async sCard(key: string): Promise<number> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.scard(key);
    }, "SCARD");
  }

  async sPop<T>(key: string, count?: number): Promise<T | T[] | null> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      if (count) {
        const values = await this.client!.spop(key, count);
        return values.map((v) => Serializer.deserialize<T>(v) as T);
      }
      const value = await this.client!.spop(key);
      return Serializer.deserialize<T>(value);
    }, "SPOP");
  }

  // ─── Sorted Set Operations ─────────────────────────────────────────────────

  async zAdd(
    key: string,
    members: Array<{ score: number; member: string }>,
    options?: { nx?: boolean; xx?: boolean; lt?: boolean; gt?: boolean }
  ): Promise<number> {
    await this.connect();
    const args: (string | number)[] = [];
    if (options?.nx) args.push("NX");
    if (options?.xx) args.push("XX");
    if (options?.lt) args.push("LT");
    if (options?.gt) args.push("GT");

    for (const { score, member } of members) {
      args.push(score, member);
    }

    return this.executeWithCircuit(async () => {
      return await this.client!.zadd(key, ...args);
    }, "ZADD");
  }

  async zRange<T>(
    key: string,
    start: number,
    stop: number,
    options?: { withScores?: boolean; rev?: boolean }
  ): Promise<T[] | Array<{ member: T; score: number }>> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      let result: string[];
      if (options?.rev) {
        result = await this.client!.zrevrange(
          key,
          start,
          stop,
          ...(options.withScores ? ["WITHSCORES"] : [])
        );
      } else {
        result = await this.client!.zrange(
          key,
          start,
          stop,
          ...(options?.withScores ? ["WITHSCORES"] : [])
        );
      }

      if (options?.withScores) {
        const parsed: Array<{ member: T; score: number }> = [];
        for (let i = 0; i < result.length; i += 2) {
          parsed.push({
            member: Serializer.deserialize<T>(result[i]) as T,
            score: parseFloat(result[i + 1]),
          });
        }
        return parsed;
      }
      return result.map((r) => Serializer.deserialize<T>(r) as T);
    }, "ZRANGE");
  }

  async zRem(key: string, ...members: string[]): Promise<number> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.zrem(key, ...members);
    }, "ZREM");
  }

  async zScore(key: string, member: string): Promise<number | null> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      const score = await this.client!.zscore(key, member);
      return score === null ? null : parseFloat(score);
    }, "ZSCORE");
  }

  async zCard(key: string): Promise<number> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.zcard(key);
    }, "ZCARD");
  }

  async zRank(key: string, member: string): Promise<number | null> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.zrank(key, member);
    }, "ZRANK");
  }

  async zCount(key: string, min: number, max: number): Promise<number> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.zcount(key, min, max);
    }, "ZCOUNT");
  }

  async zRemRangeByScore(key: string, min: number, max: number): Promise<number> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.zremrangebyscore(key, min, max);
    }, "ZREMRANGEBYSCORE");
  }

  async zRemRangeByRank(key: string, start: number, stop: number): Promise<number> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.zremrangebyrank(key, start, stop);
    }, "ZREMRANGEBYRANK");
  }

  // ─── Pattern Matching & Scan ─────────────────────────────────────────────────

  async keys(pattern: string): Promise<string[]> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.keys(pattern);
    }, "KEYS");
  }

  async scan(
    cursor: number,
    options?: { match?: string; count?: number }
  ): Promise<{ cursor: number; keys: string[] }> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      const args: (string | number)[] = [cursor];
      if (options?.match) args.push("MATCH", options.match);
      if (options?.count) args.push("COUNT", options.count);

      const [nextCursor, keys] = await this.client!.scan(...args);
      return { cursor: parseInt(nextCursor as string, 10), keys: keys as string[] };
    }, "SCAN");
  }

  async scanAll(
    pattern: string,
    options?: { count?: number }
  ): Promise<string[]> {
    const keys: string[] = [];
    let cursor = 0;

    do {
      const result = await this.scan(cursor, {
        match: pattern,
        count: options?.count || 100,
      });
      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== 0);

    return keys;
  }

  // ─── Transactions (Multi/Exec) ─────────────────────────────────────────────

  async multi(operations: (pipeline: Redis.Pipeline) => void): Promise<unknown[]> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      const pipeline = this.client!.multi();
      operations(pipeline);
      return await pipeline.exec();
    }, "MULTI");
  }

  // ─── Pub/Sub ─────────────────────────────────────────────────────────────────

  async publish(channel: string, message: unknown): Promise<number> {
    await this.connect();
    const serialized = Serializer.serialize(message);
    return this.executeWithCircuit(async () => {
      return await this.client!.publish(channel, serialized);
    }, "PUBLISH");
  }

  subscribe(
    channels: string[],
    handler: (channel: string, message: unknown) => void
  ): () => void {
    if (!this.client) {
      throw new RedisConnectionError("Redis client not initialized");
    }

    const subscriber = this.client.duplicate();

    subscriber.on("message", (channel: string, message: string) => {
      try {
        const parsed = Serializer.deserialize<unknown>(message);
        handler(channel, parsed);
      } catch (err) {
        this.logger.error("Pub/Sub message parse error", {
          channel,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });

    subscriber.subscribe(...channels);

    return () => {
      subscriber.unsubscribe(...channels);
      subscriber.quit();
    };
  }


  // ═══════════════════════════════════════════════════════════════════════════════
  // DISTRIBUTED LOCK — Sécurité du stock (anti-race condition)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Distributed Lock avec token UUID et release atomique.
   *
   * SÉCURITÉ DU STOCK — Cette méthode est cruciale :
   * Sans acquireLock, si 100 personnes cliquent sur "Acheter" en même temps
   * sur le dernier iPhone, votre base de données pourrait passer en stock négatif.
   * Le verrou distribué garantit qu'une seule requête à la fois peut décrémenter
   * le stock pour un produit donné.
   *
   * Implémentation : SET key token NX EX ttl
   * - NX : set only if not exists (atomicité)
   * - EX : expiration automatique (anti-deadlock)
   * - Token UUID : évite le "fuzzy deletion" (un client ne supprime que SON verrou)
   */
  async acquireLock(
    lockKey: string,
    ttlSeconds: number,
    options?: { retryDelayMs?: number; maxRetries?: number }
  ): Promise<{ release: () => Promise<void>; token: string } | null> {
    await this.connect();
    const token = crypto.randomUUID();
    const retryDelay = options?.retryDelayMs || 100;
    const maxRetries = options?.maxRetries || 10;

    this.logger.debug("Attempting to acquire lock", { lockKey, token, maxRetries });

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const acquired = await this.executeWithCircuit(async () => {
        const result = await this.client!.set(lockKey, token, "EX", ttlSeconds, "NX");
        return result === "OK";
      }, "ACQUIRE_LOCK");

      if (acquired) {
        this.logger.info("Lock acquired", { lockKey, token, attempt });
        return {
          token,
          release: async () => {
            await this.executeWithCircuit(async () => {
              const currentToken = await this.client!.get(lockKey);
              if (currentToken === token) {
                await this.client!.del(lockKey);
                this.logger.debug("Lock released", { lockKey, token });
              } else {
                this.logger.warn("Lock release skipped — token mismatch (lock expired or stolen)", {
                  lockKey,
                  expectedToken: token,
                  actualToken: currentToken,
                });
              }
            }, "RELEASE_LOCK");
          },
        };
      }

      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    this.logger.warn("Failed to acquire lock after max retries", {
      lockKey,
      token,
      maxRetries,
    });
    return null;
  }

  /**
   * Exécute une opération critique sous verrou distribué avec garantie de release.
   */
  async withLock<T>(
    lockKey: string,
    ttlSeconds: number,
    operation: () => Promise<T>,
    options?: { retryDelayMs?: number; maxRetries?: number }
  ): Promise<T> {
    const lock = await this.acquireLock(lockKey, ttlSeconds, options);
    if (!lock) {
      throw new RedisError(
        `Failed to acquire lock: ${lockKey}`,
        "REDIS_LOCK_ACQUISITION_FAILED"
      );
    }

    try {
      return await operation();
    } finally {
      await lock.release();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RATE LIMITING
  // ═══════════════════════════════════════════════════════════════════════════════

  async rateLimit(
    key: string,
    options: {
      windowSeconds: number;
      maxRequests: number;
    }
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    currentCount: number;
  }> {
    await this.connect();
    const now = Date.now();
    const windowMs = options.windowSeconds * 1000;
    const windowStart = now - windowMs;

    return this.executeWithCircuit(async () => {
      await this.client!.zremrangebyscore(key, 0, windowStart);

      const currentCount = await this.client!.zcard(key);

      if (currentCount >= options.maxRequests) {
        const oldest = await this.client!.zrange(key, 0, 0, "WITHSCORES");
        const resetTime = oldest.length > 0 ? parseInt(oldest[1], 10) + windowMs : now + windowMs;
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          currentCount,
        };
      }

      await this.client!.zadd(key, now, `${now}-${crypto.randomUUID()}`);
      await this.client!.expire(key, options.windowSeconds);

      return {
        allowed: true,
        remaining: options.maxRequests - currentCount - 1,
        resetTime: now + windowMs,
        currentCount: currentCount + 1,
      };
    }, "RATE_LIMIT");
  }

  async slidingWindowRateLimit(
    key: string,
    options: {
      windowSeconds: number;
      maxRequests: number;
    }
  ): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfter: number;
  }> {
    await this.connect();
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - options.windowSeconds;

    return this.executeWithCircuit(async () => {
      const pipeline = this.client!.multi();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zcard(key);
      pipeline.zadd(key, now, `${now}-${crypto.randomUUID()}`);
      pipeline.expire(key, options.windowSeconds * 2);

      const results = await pipeline.exec();
      const currentCount = (results?.[1]?.[1] as number) || 0;

      if (currentCount >= options.maxRequests) {
        const oldestScores = await this.client!.zrange(key, 0, 0, "WITHSCORES");
        const oldestTimestamp = oldestScores.length > 0 ? parseInt(oldestScores[1], 10) : windowStart;
        const retryAfter = Math.max(0, oldestTimestamp + options.windowSeconds - now);
        return { allowed: false, remaining: 0, retryAfter };
      }

      return {
        allowed: true,
        remaining: Math.max(0, options.maxRequests - currentCount - 1),
        retryAfter: 0,
      };
    }, "SLIDING_WINDOW_RATE_LIMIT");
  }

  // ─── Cache Aside Pattern ───────────────────────────────────────────────────

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: {
      ttlSeconds?: number;
      staleWhileRevalidate?: boolean;
      staleTtlSeconds?: number;
    }
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    const ttl = options?.ttlSeconds;
    await this.set(key, value, { ttlSeconds: ttl });
    return value;
  }

  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.scanAll(pattern);
    if (keys.length === 0) return 0;
    return this.del(...keys);
  }

  // ─── Key Builder Access ────────────────────────────────────────────────────

  get keys(): KeyBuilder {
    return this.keyBuilder;
  }

  // ─── Pipeline (batch operations) ────────────────────────────────────────────

  pipeline(): Redis.Pipeline {
    if (!this.client) {
      throw new RedisConnectionError("Redis client not initialized");
    }
    return this.client.pipeline();
  }

  // ─── Flush & Maintenance ───────────────────────────────────────────────────

  async flushDb(): Promise<void> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      await this.client!.flushdb();
    }, "FLUSHDB");
  }

  async info(section?: string): Promise<string> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.info(section);
    }, "INFO");
  }

  async ping(): Promise<string> {
    await this.connect();
    return this.executeWithCircuit(async () => {
      return await this.client!.ping();
    }, "PING");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

let globalRedisClient: RedisClient | null = null;

export function getRedisClient(options?: RedisClientOptions): RedisClient {
  if (!globalRedisClient) {
    globalRedisClient = RedisClient.getInstance(options);
  }
  return globalRedisClient;
}

export function resetRedisClient(): void {
  if (globalRedisClient) {
    globalRedisClient.disconnect().catch(() => {});
    globalRedisClient = null;
  }
  RedisClient.resetInstance();
}

export { RedisClient, RedisNamespaces, KeyBuilder, Serializer };


// ═══════════════════════════════════════════════════════════════════════════════
// DOMAIN-SPECIFIC HELPERS (Boutiquecogi3)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Helpers typés pour les cas d'usage métier de Boutiquecogi3.
 *
 * HASHES POUR LE PANIER :
 * Utiliser HSET au lieu de stocker un gros JSON permet de modifier la quantité
 * d'un seul produit sans avoir à lire/écrire tout le panier. Par exemple, si
 * l'utilisateur change la quantité du produit #3 dans un panier de 50 articles,
 * HSET modifie uniquement le champ concerné (O(1)) au lieu de resérialiser
 * tout le JSON (O(n)).
 */

export const redisHelpers = {
  // ─── Sessions Better-Auth ──────────────────────────────────────────────────
  session: {
    key: (sessionToken: string) =>
      getRedisClient().keys.build(RedisNamespaces.SESSION, sessionToken),

    async get(sessionToken: string) {
      return getRedisClient().get<{
        userId: string;
        email: string;
        roleLevel: number;
        expiresAt: number;
      }>(this.key(sessionToken));
    },

    async set(
      sessionToken: string,
      data: { userId: string; email: string; roleLevel: number; expiresAt: number },
      ttlSeconds: number
    ) {
      return getRedisClient().setex(this.key(sessionToken), ttlSeconds, data);
    },

    async del(sessionToken: string) {
      return getRedisClient().del(this.key(sessionToken));
    },
  },

  // ─── Panier d'achat (Hash) ─────────────────────────────────────────────────
  cart: {
    key: (userId: string) =>
      getRedisClient().keys.build(RedisNamespaces.CART, userId),

    async get(userId: string) {
      return getRedisClient().hGetAll<{
        productId: string;
        quantity: number;
        variantId?: string;
        addedAt: number;
      }>(this.key(userId));
    },

    async addItem(
      userId: string,
      itemKey: string,
      item: { productId: string; quantity: number; variantId?: string; addedAt: number },
      ttlSeconds = 7 * 24 * 3600 // 7 jours
    ) {
      return getRedisClient().hSet(this.key(userId), itemKey, item, {
        ttlSeconds,
      });
    },

    async removeItem(userId: string, itemKey: string) {
      return getRedisClient().hDel(this.key(userId), itemKey);
    },

    async clear(userId: string) {
      return getRedisClient().del(this.key(userId));
    },

    /** Incrémente la quantité d'un article sans lire tout le panier */
    async incrementQuantity(userId: string, itemKey: string, delta: number) {
      const current = await getRedisClient().hGet<string>(
        this.key(userId),
        itemKey
      );
      if (!current) return null;
      const parsed = JSON.parse(current);
      parsed.quantity = (parsed.quantity || 0) + delta;
      await getRedisClient().hSet(this.key(userId), itemKey, parsed);
      return parsed;
    },
  },

  // ─── Cache produit ─────────────────────────────────────────────────────────
  product: {
    key: (productId: string) =>
      getRedisClient().keys.build(RedisNamespaces.PRODUCT, productId),

    async get(productId: string) {
      return getRedisClient().get<Record<string, unknown>>(this.key(productId));
    },

    async set(productId: string, data: Record<string, unknown>, ttlSeconds = 3600) {
      return getRedisClient().setex(this.key(productId), ttlSeconds, data);
    },

    async invalidate(productId: string) {
      return getRedisClient().del(this.key(productId));
    },

    async invalidateAll() {
      return getRedisClient().invalidatePattern(
        getRedisClient().keys.all(RedisNamespaces.PRODUCT)
      );
    },
  },

  // ─── Inventaire / Stock (avec lock pour sécurité) ─────────────────────────
  inventory: {
    key: (productId: string, variantId?: string) =>
      getRedisClient().keys.build(
        RedisNamespaces.INVENTORY,
        productId,
        variantId || "default"
      ),

    async getStock(productId: string, variantId?: string) {
      const stock = await getRedisClient().get<number>(
        this.key(productId, variantId)
      );
      return stock ?? null;
    },

    async setStock(
      productId: string,
      stock: number,
      variantId?: string,
      ttlSeconds = 300
    ) {
      return getRedisClient().setex(
        this.key(productId, variantId),
        ttlSeconds,
        stock
      );
    },

    /**
     * Décrémente le stock de manière atomique.
     * ⚠️ Pour les opérations critiques (checkout), utiliser withLock() en plus.
     */
    async decrementStock(productId: string, quantity: number, variantId?: string) {
      return getRedisClient().decrBy(
        this.key(productId, variantId),
        quantity
      );
    },

    async incrementStock(productId: string, quantity: number, variantId?: string) {
      return getRedisClient().incrBy(
        this.key(productId, variantId),
        quantity
      );
    },

    /**
     * Décrémente le stock sous verrou distribué — empêche le stock négatif.
     * Utilisé lors du checkout pour garantir l'intégrité des données.
     */
    async decrementStockSafe(
      productId: string,
      quantity: number,
      variantId?: string,
      options?: { lockTtlSeconds?: number; maxRetries?: number }
    ): Promise<{ success: boolean; remainingStock: number }> {
      const lockKey = getRedisClient().keys.build(
        RedisNamespaces.LOCK,
        "inventory",
        productId,
        variantId || "default"
      );

      return getRedisClient().withLock(
        lockKey,
        options?.lockTtlSeconds || 10,
        async () => {
          const currentStock = await this.getStock(productId, variantId);
          if (currentStock === null || currentStock < quantity) {
            return { success: false, remainingStock: currentStock ?? 0 };
          }
          const remaining = await this.decrementStock(productId, quantity, variantId);
          return { success: true, remainingStock: remaining };
        },
        { maxRetries: options?.maxRetries }
      );
    },
  },

  // ─── RBAC Permissions Cache ────────────────────────────────────────────────
  rbac: {
    permissionsKey: (roleLevel: number) =>
      getRedisClient().keys.build(RedisNamespaces.RBAC, "permissions", roleLevel),

    restrictionsKey: (roleLevel: number) =>
      getRedisClient().keys.build(RedisNamespaces.RBAC, "restrictions", roleLevel),

    async getPermissions(roleLevel: number) {
      return getRedisClient().get<string[]>(this.permissionsKey(roleLevel));
    },

    async setPermissions(roleLevel: number, permissions: string[], ttlSeconds = 600) {
      return getRedisClient().setex(
        this.permissionsKey(roleLevel),
        ttlSeconds,
        permissions
      );
    },

    async getRestrictions(roleLevel: number) {
      return getRedisClient().get<Record<string, boolean>>(
        this.restrictionsKey(roleLevel)
      );
    },

    async setRestrictions(
      roleLevel: number,
      restrictions: Record<string, boolean>,
      ttlSeconds = 600
    ) {
      return getRedisClient().setex(
        this.restrictionsKey(roleLevel),
        ttlSeconds,
        restrictions
      );
    },

    async invalidateRole(roleLevel: number) {
      return getRedisClient().del(
        this.permissionsKey(roleLevel),
        this.restrictionsKey(roleLevel)
      );
    },

    async invalidateAll() {
      return getRedisClient().invalidatePattern(
        getRedisClient().keys.all(RedisNamespaces.RBAC)
      );
    },
  },

  // ─── Rate Limiting par endpoint ────────────────────────────────────────────
  rateLimit: {
    key: (identifier: string, endpoint: string) =>
      getRedisClient().keys.build(
        RedisNamespaces.RATE_LIMIT,
        identifier,
        endpoint
      ),

    async check(
      identifier: string,
      endpoint: string,
      options: { windowSeconds: number; maxRequests: number }
    ) {
      return getRedisClient().slidingWindowRateLimit(
        this.key(identifier, endpoint),
        options
      );
    },
  },

  // ─── Commandes (CinetPay webhook dedup) ────────────────────────────────────
  order: {
    webhookKey: (transactionId: string) =>
      getRedisClient().keys.build(
        RedisNamespaces.CINETPAY,
        "webhook",
        transactionId
      ),

    async isWebhookProcessed(transactionId: string): Promise<boolean> {
      const exists = await getRedisClient().exists(
        this.webhookKey(transactionId)
      );
      return exists > 0;
    },

    async markWebhookProcessed(transactionId: string, ttlSeconds = 86400) {
      return getRedisClient().setex(
        this.webhookKey(transactionId),
        ttlSeconds,
        { processedAt: Date.now(), transactionId }
      );
    },

    statusKey: (orderId: string) =>
      getRedisClient().keys.build(RedisNamespaces.ORDER, "status", orderId),

    async getStatus(orderId: string) {
      return getRedisClient().get<string>(this.statusKey(orderId));
    },

    async setStatus(orderId: string, status: string, ttlSeconds = 3600) {
      return getRedisClient().setex(this.statusKey(orderId), ttlSeconds, status);
    },
  },

  // ─── Feature Flags ──────────────────────────────────────────────────────────
  featureFlag: {
    key: (flagName: string) =>
      getRedisClient().keys.build(RedisNamespaces.FEATURE_FLAG, flagName),

    async isEnabled(flagName: string, defaultValue = false): Promise<boolean> {
      const value = await getRedisClient().get<boolean>(this.key(flagName));
      return value ?? defaultValue;
    },

    async set(flagName: string, enabled: boolean) {
      return getRedisClient().set(this.key(flagName), enabled);
    },

    async toggle(flagName: string) {
      const current = await this.isEnabled(flagName);
      await this.set(flagName, !current);
      return !current;
    },
  },

  // ─── Analytics temporaires ─────────────────────────────────────────────────
  analytics: {
    pageViewKey: (page: string, date = new Date().toISOString().split("T")[0]) =>
      getRedisClient().keys.build(RedisNamespaces.ANALYTICS, "pv", page, date),

    async incrementPageView(page: string) {
      return getRedisClient().incr(this.pageViewKey(page));
    },

    async getPageViews(page: string, date?: string) {
      const count = await getRedisClient().get<number>(
        this.pageViewKey(page, date)
      );
      return count ?? 0;
    },

    eventKey: (eventName: string, date = new Date().toISOString().split("T")[0]) =>
      getRedisClient().keys.build(RedisNamespaces.ANALYTICS, "event", eventName, date),

    async trackEvent(eventName: string, metadata?: Record<string, unknown>) {
      const key = this.eventKey(eventName);
      const entry = { timestamp: Date.now(), ...metadata };
      await getRedisClient().rPush(key, entry);
      await getRedisClient().expire(key, 7 * 24 * 3600); // 7 jours
    },

    async getEvents(eventName: string, start = 0, stop = -1) {
      return getRedisClient().lRange<Record<string, unknown>>(
        this.eventKey(eventName),
        start,
        stop
      );
    },
  },

  // ─── Recherche / Autocomplétion ────────────────────────────────────────────
  search: {
    suggestionsKey: (prefix: string) =>
      getRedisClient().keys.build(RedisNamespaces.SEARCH, "suggestions", prefix),

    async addSuggestion(query: string, score = 1) {
      const key = this.suggestionsKey(query.slice(0, 3).toLowerCase());
      return getRedisClient().zAdd(key, [{ member: query, score }], {
        gt: true,
      });
    },

    async getSuggestions(prefix: string, count = 5) {
      const key = this.suggestionsKey(prefix.toLowerCase());
      return getRedisClient().zRange<string>(key, 0, count - 1, {
        rev: true,
      });
    },
  },

  // ─── Recommandations (produits similaires) ─────────────────────────────────
  recommendation: {
    similarKey: (productId: string) =>
      getRedisClient().keys.build(RedisNamespaces.RECOMMENDATION, "similar", productId),

    async setSimilar(productId: string, similarProductIds: string[], ttlSeconds = 3600) {
      const entries = similarProductIds.map((id, index) => ({
        score: similarProductIds.length - index,
        member: id,
      }));
      await getRedisClient().zAdd(this.similarKey(productId), entries);
      await getRedisClient().expire(this.similarKey(productId), ttlSeconds);
    },

    async getSimilar(productId: string, count = 5) {
      return getRedisClient().zRange<string>(
        this.similarKey(productId),
        0,
        count - 1,
        { rev: true }
      );
    },
  },

  // ─── Email Verification / Password Reset / Magic Link ──────────────────────
  verification: {
    emailKey: (token: string) =>
      getRedisClient().keys.build(RedisNamespaces.EMAIL_VERIFICATION, token),

    async storeEmailToken(token: string, userId: string, ttlSeconds = 3600) {
      return getRedisClient().setex(this.emailKey(token), ttlSeconds, {
        userId,
        createdAt: Date.now(),
      });
    },

    async getEmailToken(token: string) {
      return getRedisClient().get<{ userId: string; createdAt: number }>(
        this.emailKey(token)
      );
    },

    passwordResetKey: (token: string) =>
      getRedisClient().keys.build(RedisNamespaces.PASSWORD_RESET, token),

    async storePasswordResetToken(token: string, userId: string, ttlSeconds = 3600) {
      return getRedisClient().setex(this.passwordResetKey(token), ttlSeconds, {
        userId,
        createdAt: Date.now(),
      });
    },

    async getPasswordResetToken(token: string) {
      return getRedisClient().get<{ userId: string; createdAt: number }>(
        this.passwordResetKey(token)
      );
    },

    magicLinkKey: (token: string) =>
      getRedisClient().keys.build(RedisNamespaces.MAGIC_LINK, token),

    async storeMagicLink(token: string, email: string, ttlSeconds = 900) {
      return getRedisClient().setex(this.magicLinkKey(token), ttlSeconds, {
        email,
        createdAt: Date.now(),
      });
    },

    async getMagicLink(token: string) {
      return getRedisClient().get<{ email: string; createdAt: number }>(
        this.magicLinkKey(token)
      );
    },
  },

  // ─── OAuth State (CSRF protection) ─────────────────────────────────────────
  oauth: {
    stateKey: (state: string) =>
      getRedisClient().keys.build(RedisNamespaces.OAUTH_STATE, state),

    async storeState(state: string, provider: string, redirectUrl: string, ttlSeconds = 600) {
      return getRedisClient().setex(this.stateKey(state), ttlSeconds, {
        provider,
        redirectUrl,
        createdAt: Date.now(),
      });
    },

    async verifyState(state: string) {
      const data = await getRedisClient().get<{
        provider: string;
        redirectUrl: string;
        createdAt: number;
      }>(this.stateKey(state));
      if (data) {
        await getRedisClient().del(this.stateKey(state));
      }
      return data;
    },
  },

  // ─── Catégories (cache hiérarchique) ───────────────────────────────────────
  category: {
    treeKey: () => getRedisClient().keys.build(RedisNamespaces.CATEGORY, "tree"),
    listKey: () => getRedisClient().keys.build(RedisNamespaces.CATEGORY, "list"),

    async getTree() {
      return getRedisClient().get<Record<string, unknown>>(this.treeKey());
    },

    async setTree(tree: Record<string, unknown>, ttlSeconds = 3600) {
      return getRedisClient().setex(this.treeKey(), ttlSeconds, tree);
    },

    async getList() {
      return getRedisClient().get<Array<Record<string, unknown>>>(this.listKey());
    },

    async setList(list: Array<Record<string, unknown>>, ttlSeconds = 3600) {
      return getRedisClient().setex(this.listKey(), ttlSeconds, list);
    },

    async invalidateAll() {
      return getRedisClient().invalidatePattern(
        getRedisClient().keys.all(RedisNamespaces.CATEGORY)
      );
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type { RedisConfig, CircuitState, Namespace };


// ═══════════════════════════════════════════════════════════════════════════════
// REDIS CLUSTER SUPPORT — Haute disponibilité & scalabilité horizontale
// ═══════════════════════════════════════════════════════════════════════════════

import { Cluster } from "ioredis";

const RedisClusterConfigSchema = z.object({
  enableCluster: z.boolean().default(false),
  nodes: z.array(z.object({
    host: z.string(),
    port: z.coerce.number().int().min(1).max(65535),
  })).default([]),
  clusterOptions: z.object({
    maxRedirections: z.coerce.number().int().min(1).default(16),
    retryDelayOnFailover: z.coerce.number().int().min(0).default(300),
    retryDelayOnClusterDown: z.coerce.number().int().min(0).default(300),
    enableOfflineQueue: z.boolean().default(true),
    scaleReads: z.enum(["master", "slave", "all"]).default("master"),
  }).default({}),
});

type RedisClusterConfig = z.infer<typeof RedisClusterConfigSchema>;

const DEFAULT_CLUSTER_CONFIG: RedisClusterConfig = {
  enableCluster: process.env.REDIS_CLUSTER_ENABLED === "true",
  nodes: process.env.REDIS_CLUSTER_NODES
    ? process.env.REDIS_CLUSTER_NODES.split(",").map((node) => {
        const [host, port] = node.trim().split(":");
        return { host, port: parseInt(port || "6379", 10) };
      })
    : [],
  clusterOptions: {
    maxRedirections: parseInt(process.env.REDIS_CLUSTER_MAX_REDIRECTIONS || "16", 10),
    retryDelayOnFailover: parseInt(process.env.REDIS_CLUSTER_RETRY_DELAY || "300", 10),
    retryDelayOnClusterDown: parseInt(process.env.REDIS_CLUSTER_DOWN_DELAY || "300", 10),
    enableOfflineQueue: process.env.REDIS_CLUSTER_OFFLINE_QUEUE !== "false",
    scaleReads: (process.env.REDIS_CLUSTER_SCALE_READS as "master" | "slave" | "all") || "master",
  },
};

/**
 * Client Redis Cluster avec support natif ioredis.
 * Utilisé pour la haute disponibilité et le sharding automatique des données.
 */
export class RedisClusterClient {
  private static instance: RedisClusterClient | null = null;
  private cluster: Cluster | null = null;
  private readonly config: RedisClusterConfig;
  private readonly logger: RedisLogger;
  private isConnected = false;

  private constructor(options: { clusterConfig?: Partial<RedisClusterConfig> } = {}) {
    const parsed = RedisClusterConfigSchema.safeParse({
      ...DEFAULT_CLUSTER_CONFIG,
      ...options.clusterConfig,
    });

    if (!parsed.success) {
      throw new RedisError(
        `Invalid Redis cluster configuration: ${parsed.error.message}`,
        "REDIS_CLUSTER_CONFIG_ERROR"
      );
    }

    this.config = parsed.data;
    this.logger = getLogger().child({ component: "RedisClusterClient" });
  }

  static getInstance(options?: { clusterConfig?: Partial<RedisClusterConfig> }): RedisClusterClient {
    if (!RedisClusterClient.instance) {
      RedisClusterClient.instance = new RedisClusterClient(options);
    }
    return RedisClusterClient.instance;
  }

  static resetInstance(): void {
    if (RedisClusterClient.instance) {
      RedisClusterClient.instance.disconnect().catch(() => {});
      RedisClusterClient.instance = null;
    }
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    if (!this.config.enableCluster) {
      throw new RedisError("Cluster mode is disabled", "REDIS_CLUSTER_DISABLED");
    }

    return new Promise((resolve, reject) => {
      try {
        this.cluster = new Cluster(this.config.nodes, {
          redisOptions: {
            password: DEFAULT_CONFIG.password,
            maxRetriesPerRequest: DEFAULT_CONFIG.maxRetriesPerRequest,
            connectTimeout: DEFAULT_CONFIG.connectTimeout,
            commandTimeout: DEFAULT_CONFIG.commandTimeout,
            tls: DEFAULT_CONFIG.tls
              ? { rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false" }
              : undefined,
          },
          ...this.config.clusterOptions,
          slotsRefreshTimeout: 2000,
          slotsRefreshInterval: 5000,
        });

        this.cluster.on("connect", () => {
          this.logger.info("Cluster connection established");
        });

        this.cluster.on("ready", () => {
          this.isConnected = true;
          this.logger.info("Cluster client ready", {
            nodes: this.config.nodes.length,
            scaleReads: this.config.clusterOptions.scaleReads,
          });
          resolve();
        });

        this.cluster.on("error", (err: Error) => {
          this.logger.error("Cluster error", { error: err.message });
          if (!this.isConnected) {
            reject(new RedisConnectionError(err.message, err));
          }
        });

        this.cluster.on("node error", (err: Error, node: { host: string; port: number }) => {
          this.logger.warn("Cluster node error", {
            error: err.message,
            node: `${node.host}:${node.port}`,
          });
        });

        this.cluster.on("+node", (node: { host: string; port: number }) => {
          this.logger.info("Cluster node added", { node: `${node.host}:${node.port}` });
        });

        this.cluster.on("-node", (node: { host: string; port: number }) => {
          this.logger.warn("Cluster node removed", { node: `${node.host}:${node.port}` });
        });

        this.cluster.connect().catch((err: Error) => {
          reject(new RedisConnectionError("Failed to connect to cluster", err));
        });
      } catch (err) {
        reject(new RedisConnectionError("Failed to create cluster client", err));
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.cluster) {
      await this.cluster.quit();
      this.cluster = null;
      this.isConnected = false;
      this.logger.info("Cluster disconnected");
    }
  }

  getCluster(): Cluster {
    if (!this.cluster) {
      throw new RedisConnectionError("Redis cluster not initialized");
    }
    return this.cluster;
  }

  isHealthy(): boolean {
    return this.isConnected && !!this.cluster;
  }

  getMetrics() {
    return {
      isConnected: this.isConnected,
      nodes: this.config.nodes,
      scaleReads: this.config.clusterOptions.scaleReads,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REDIS STREAMS — Event Sourcing & Message Queue
// ═══════════════════════════════════════════════════════════════════════════════

export interface StreamMessage {
  id: string;
  data: Record<string, string>;
}

export interface StreamConsumerGroup {
  stream: string;
  group: string;
  consumer: string;
}

/**
 * Redis Streams pour l'event sourcing et le traitement asynchrone.
 * Idéal pour : logs d'audit, notifications, traitement de commandes, analytics.
 */
export class RedisStreamManager {
  private client: RedisClient;
  private logger: RedisLogger;

  constructor(client: RedisClient) {
    this.client = client;
    this.logger = getLogger().child({ component: "RedisStreamManager" });
  }

  /**
   * Ajoute un événement à un stream (producteur)
   */
  async addEvent(
    streamKey: string,
    event: Record<string, unknown>,
    options?: { maxLen?: number; approximate?: boolean }
  ): Promise<string> {
    const serialized: Record<string, string> = {};
    for (const [key, value] of Object.entries(event)) {
      serialized[key] = JSON.stringify(value);
    }

    return this.client.executeWithCircuit(async () => {
      const args: (string | number)[] = [streamKey];

      if (options?.maxLen) {
        args.push("MAXLEN");
        if (options.approximate) args.push("~");
        args.push(options.maxLen);
      }

      args.push("*"); // Auto-generate ID
      for (const [key, value] of Object.entries(serialized)) {
        args.push(key, value);
      }

      const id = await this.client.getClient().xadd(...args as [string, ...Array<string | number>]);
      this.logger.debug("Event added to stream", { stream: streamKey, id });
      return id as string;
    }, "XADD");
  }

  /**
   * Crée un groupe de consommateurs
   */
  async createConsumerGroup(
    streamKey: string,
    groupName: string,
    options?: { mkStream?: boolean; id?: string }
  ): Promise<void> {
    await this.client.executeWithCircuit(async () => {
      const args: (string | number)[] = ["CREATE", streamKey, groupName];
      if (options?.mkStream) args.push("MKSTREAM");
      args.push(options?.id || "$"); // $ = only new messages

      await this.client.getClient().xgroup(...args as [string, string, string, ...Array<string | number>]);
      this.logger.info("Consumer group created", { stream: streamKey, group: groupName });
    }, "XGROUP CREATE");
  }

  /**
   * Lit des messages depuis un stream (consommateur)
   */
  async readEvents(
    streamKey: string,
    options?: {
      count?: number;
      block?: number;
      lastId?: string;
    }
  ): Promise<StreamMessage[]> {
    return this.client.executeWithCircuit(async () => {
      const args: (string | number)[] = ["STREAMS", streamKey];
      args.push(options?.lastId || "0");

      const results = await this.client.getClient().xread(
        "COUNT", options?.count || 10,
        ...(options?.block !== undefined ? ["BLOCK", options.block] : []),
        ...args
      );

      if (!results || results.length === 0) return [];

      const messages: StreamMessage[] = [];
      for (const [, streamMessages] of results) {
        for (const [id, fields] of streamMessages) {
          const data: Record<string, string> = {};
          for (let i = 0; i < fields.length; i += 2) {
            data[fields[i]] = fields[i + 1];
          }
          messages.push({ id: id as string, data });
        }
      }

      return messages;
    }, "XREAD");
  }

  /**
   * Lit des messages depuis un groupe de consommateurs
   */
  async readGroup(
    group: StreamConsumerGroup,
    options?: {
      count?: number;
      block?: number;
      noAck?: boolean;
    }
  ): Promise<StreamMessage[]> {
    return this.client.executeWithCircuit(async () => {
      const args: (string | number)[] = [
        "GROUP", group.group, group.consumer,
        "COUNT", options?.count || 10,
      ];

      if (options?.block !== undefined) {
        args.push("BLOCK", options.block);
      }

      if (options?.noAck) args.push("NOACK");

      args.push("STREAMS", group.stream, ">"); // > = only undelivered messages

      const results = await this.client.getClient().xreadgroup(...args as [string, ...Array<string | number>]);

      if (!results || results.length === 0) return [];

      const messages: StreamMessage[] = [];
      for (const [, streamMessages] of results) {
        for (const [id, fields] of streamMessages) {
          const data: Record<string, string> = {};
          for (let i = 0; i < fields.length; i += 2) {
            data[fields[i]] = fields[i + 1];
          }
          messages.push({ id: id as string, data });
        }
      }

      return messages;
    }, "XREADGROUP");
  }

  /**
   * Accuse réception d'un message (ACK)
   */
  async acknowledge(
    streamKey: string,
    groupName: string,
    ...messageIds: string[]
  ): Promise<number> {
    return this.client.executeWithCircuit(async () => {
      const result = await this.client.getClient().xack(streamKey, groupName, ...messageIds);
      this.logger.debug("Messages acknowledged", { stream: streamKey, count: result });
      return result;
    }, "XACK");
  }

  /**
   * Récupère les messages en attente (pending) d'un consommateur
   */
  async getPending(
    streamKey: string,
    groupName: string,
    options?: {
      consumer?: string;
      start?: string;
      end?: string;
      count?: number;
    }
  ): Promise<Array<{
    id: string;
    consumer: string;
    elapsedMs: number;
    deliveries: number;
  }>> {
    return this.client.executeWithCircuit(async () => {
      const args: (string | number)[] = [streamKey, groupName];

      if (options?.start) {
        args.push(options.start, options.end || "+", options.count || 10);
      }

      const result = await this.client.getClient().xpending(...args as [string, string, ...Array<string | number>]);

      if (!Array.isArray(result)) return [];

      return result.map((item: unknown[]) => ({
        id: item[0] as string,
        consumer: item[1] as string,
        elapsedMs: item[2] as number,
        deliveries: item[3] as number,
      }));
    }, "XPENDING");
  }

  /**
   * Réclame des messages non traités (claim) pour retraitement
   */
  async claimMessages(
    streamKey: string,
    groupName: string,
    consumerName: string,
    minIdleTime: number,
    ...messageIds: string[]
  ): Promise<StreamMessage[]> {
    return this.client.executeWithCircuit(async () => {
      const results = await this.client.getClient().xclaim(
        streamKey, groupName, consumerName, minIdleTime, ...messageIds
      );

      return results.map((item: unknown[]) => ({
        id: item[0] as string,
        data: (() => {
          const fields = item[1] as string[];
          const data: Record<string, string> = {};
          for (let i = 0; i < fields.length; i += 2) {
            data[fields[i]] = fields[i + 1];
          }
          return data;
        })(),
      }));
    }, "XCLAIM");
  }

  /**
   * Supprime des messages d'un stream
   */
  async deleteEvents(streamKey: string, ...messageIds: string[]): Promise<number> {
    return this.client.executeWithCircuit(async () => {
      return await this.client.getClient().xdel(streamKey, ...messageIds);
    }, "XDEL");
  }

  /**
   * Récupère les informations d'un stream
   */
  async getStreamInfo(streamKey: string): Promise<{
    length: number;
    radixTreeKeys: number;
    radixTreeNodes: number;
    groups: number;
    lastGeneratedId: string;
    firstEntry: StreamMessage | null;
    lastEntry: StreamMessage | null;
  }> {
    return this.client.executeWithCircuit(async () => {
      const info = await this.client.getClient().xinfo("STREAM", streamKey);
      const parsed: Record<string, unknown> = {};
      for (let i = 0; i < info.length; i += 2) {
        parsed[info[i] as string] = info[i + 1];
      }

      return {
        length: parsed.length as number,
        radixTreeKeys: parsed["radix-tree-keys"] as number,
        radixTreeNodes: parsed["radix-tree-nodes"] as number,
        groups: parsed.groups as number,
        lastGeneratedId: parsed["last-generated-id"] as string,
        firstEntry: parsed["first-entry"] ? {
          id: (parsed["first-entry"] as unknown[])[0] as string,
          data: (() => {
            const fields = (parsed["first-entry"] as unknown[])[1] as string[];
            const data: Record<string, string> = {};
            for (let i = 0; i < fields.length; i += 2) {
              data[fields[i]] = fields[i + 1];
            }
            return data;
          })(),
        } : null,
        lastEntry: parsed["last-entry"] ? {
          id: (parsed["last-entry"] as unknown[])[0] as string,
          data: (() => {
            const fields = (parsed["last-entry"] as unknown[])[1] as string[];
            const data: Record<string, string> = {};
            for (let i = 0; i < fields.length; i += 2) {
              data[fields[i]] = fields[i + 1];
            }
            return data;
          })(),
        } : null,
      };
    }, "XINFO STREAM");
  }

  /**
   * Tronque un stream à une taille maximale
   */
  async trimStream(streamKey: string, maxLen: number, approximate = true): Promise<number> {
    return this.client.executeWithCircuit(async () => {
      const args: (string | number)[] = ["MAXLEN"];
      if (approximate) args.push("~");
      args.push(maxLen);

      return await this.client.getClient().xtrim(streamKey, ...args as [string, ...Array<string | number>]);
    }, "XTRIM");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// L1 IN-MEMORY CACHE — Cache local ultra-rapide devant Redis
// ═══════════════════════════════════════════════════════════════════════════════

interface L1CacheEntry<T> {
  value: T;
  expiresAt: number;
  version: number;
}

export interface L1CacheConfig {
  maxSize: number;
  defaultTtlMs: number;
  enabled: boolean;
}

/**
 * Cache L1 In-Memory (Map) devant Redis (L2).
 * 
 * Architecture :
 *   Client → L1 (Map, <1ms) → miss → L2 (Redis, ~2ms) → miss → DB (~45ms)
 * 
 * Invalidation : Pub/Sub cross-process pour synchroniser les L1 entre instances.
 */
export class L1CacheManager {
  private cache = new Map<string, L1CacheEntry<unknown>>();
  private config: L1CacheConfig;
  private hitCount = 0;
  private missCount = 0;
  private logger: RedisLogger;
  private invalidateHandler?: () => void;

  constructor(config?: Partial<L1CacheConfig>) {
    this.config = {
      maxSize: 1000,
      defaultTtlMs: 30000, // 30s par défaut
      enabled: true,
      ...config,
    };
    this.logger = getLogger().child({ component: "L1CacheManager" });
  }

  /**
   * Active la synchronisation cross-process via Redis Pub/Sub
   */
  enableCrossProcessSync(redisClient: RedisClient): void {
    this.invalidateHandler = redisClient.subscribe(
      ["l1-cache:invalidate"],
      (channel, message) => {
        if (typeof message === "string") {
          this.delete(message);
          this.logger.debug("L1 cache invalidated via Pub/Sub", { key: message });
        }
      }
    );
  }

  get<T>(key: string): T | undefined {
    if (!this.config.enabled) return undefined;

    const entry = this.cache.get(key);
    if (!entry) {
      this.missCount++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.missCount++;
      return undefined;
    }

    this.hitCount++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    if (!this.config.enabled) return;

    // Eviction LRU si nécessaire
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.config.defaultTtlMs),
      version: 1,
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Invalide et broadcast aux autres processus
   */
  async invalidate(key: string, redisClient?: RedisClient): Promise<void> {
    this.delete(key);

    if (redisClient) {
      await redisClient.publish("l1-cache:invalidate", key);
    }
  }

  /**
   * Pattern invalidation (supprime les clés correspondant au pattern)
   */
  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  getMetrics() {
    const total = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: total > 0 ? this.hitCount / total : 0,
      hitCount: this.hitCount,
      missCount: this.missCount,
      enabled: this.config.enabled,
    };
  }

  dispose(): void {
    this.invalidateHandler?.();
    this.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MONITORING & METRICS — Intégration système de monitoring
// ═══════════════════════════════════════════════════════════════════════════════

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

/**
 * Collecteur de métriques Redis pour monitoring (Prometheus, Datadog, etc.)
 */
export class RedisMetricsCollector {
  private client: RedisClient;
  private logger: RedisLogger;
  private operationLatencies: number[] = [];
  private operationCount = 0;
  private errorCount = 0;
  private readonly maxLatencySamples = 1000;

  constructor(client: RedisClient) {
    this.client = client;
    this.logger = getLogger().child({ component: "RedisMetricsCollector" });
  }

  /**
   * Enregistre la latence d'une opération
   */
  recordOperation(latencyMs: number, success: boolean): void {
    this.operationCount++;
    if (!success) this.errorCount++;

    this.operationLatencies.push(latencyMs);
    if (this.operationLatencies.length > this.maxLatencySamples) {
      this.operationLatencies.shift();
    }
  }

  /**
   * Collecte les métriques complètes
   */
  async collect(): Promise<RedisMetrics> {
    const info = await this.client.info();
    const infoMap = this.parseInfo(info);

    const latencies = [...this.operationLatencies].sort((a, b) => a - b);
    const p99Index = Math.floor(latencies.length * 0.99);

    return {
      timestamp: Date.now(),
      connection: {
        isConnected: this.client.isHealthy(),
        isHealthy: this.client.isHealthy(),
        circuitState: this.client.getMetrics().circuitBreaker.state,
      },
      performance: {
        totalOperations: this.operationCount,
        averageLatencyMs: latencies.length > 0
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length
          : 0,
        p99LatencyMs: latencies[p99Index] || 0,
        errorRate: this.operationCount > 0 ? this.errorCount / this.operationCount : 0,
      },
      memory: {
        usedMemory: parseInt(infoMap["used_memory"] || "0", 10),
        usedMemoryHuman: infoMap["used_memory_human"] || "0B",
        keyCount: parseInt(infoMap["db0"]?.match(/keys=(\d+)/)?.[1] || "0", 10),
      },
      throughput: {
        opsPerSecond: parseInt(infoMap["instantaneous_ops_per_sec"] || "0", 10),
        connectedClients: parseInt(infoMap["connected_clients"] || "0", 10),
        blockedClients: parseInt(infoMap["blocked_clients"] || "0", 10),
      },
    };
  }

  /**
   * Exporte les métriques au format Prometheus
   */
  async exportPrometheus(): Promise<string> {
    const metrics = await this.collect();

    return `
# HELP redis_connection_is_connected Connection status
# TYPE redis_connection_is_connected gauge
redis_connection_is_connected ${metrics.connection.isConnected ? 1 : 0}

# HELP redis_connection_is_healthy Health status
# TYPE redis_connection_is_healthy gauge
redis_connection_is_healthy ${metrics.connection.isHealthy ? 1 : 0}

# HELP redis_performance_total_operations Total operations
# TYPE redis_performance_total_operations counter
redis_performance_total_operations ${metrics.performance.totalOperations}

# HELP redis_performance_average_latency_ms Average latency
# TYPE redis_performance_average_latency_ms gauge
redis_performance_average_latency_ms ${metrics.performance.averageLatencyMs.toFixed(2)}

# HELP redis_performance_p99_latency_ms P99 latency
# TYPE redis_performance_p99_latency_ms gauge
redis_performance_p99_latency_ms ${metrics.performance.p99LatencyMs.toFixed(2)}

# HELP redis_performance_error_rate Error rate
# TYPE redis_performance_error_rate gauge
redis_performance_error_rate ${metrics.performance.errorRate.toFixed(4)}

# HELP redis_memory_used_bytes Used memory
# TYPE redis_memory_used_bytes gauge
redis_memory_used_bytes ${metrics.memory.usedMemory}

# HELP redis_memory_key_count Key count
# TYPE redis_memory_key_count gauge
redis_memory_key_count ${metrics.memory.keyCount}

# HELP redis_throughput_ops_per_second Operations per second
# TYPE redis_throughput_ops_per_second gauge
redis_throughput_ops_per_second ${metrics.throughput.opsPerSecond}

# HELP redis_throughput_connected_clients Connected clients
# TYPE redis_throughput_connected_clients gauge
redis_throughput_connected_clients ${metrics.throughput.connectedClients}
`.trim();
  }

  /**
   * Démarre la collecte périodique des métriques
   */
  startPeriodicCollection(
    intervalMs: number,
    callback: (metrics: RedisMetrics) => void
  ): () => void {
    const interval = setInterval(async () => {
      try {
        const metrics = await this.collect();
        callback(metrics);
      } catch (err) {
        this.logger.error("Failed to collect metrics", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }

  private parseInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const line of info.split("\r\n")) {
      const [key, value] = line.split(":");
      if (key && value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REAL-TIME NOTIFICATIONS — Pub/Sub avancé avec room management
// ═══════════════════════════════════════════════════════════════════════════════

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

/**
 * Gestionnaire de notifications temps réel via Redis Pub/Sub.
 * Supporte les rooms, les broadcasts, et les messages privés.
 */
export class RealtimeNotificationManager {
  private client: RedisClient;
  private subscriber: Redis | null = null;
  private roomHandlers = new Map<string, Set<(payload: NotificationPayload) => void>>();
  private userHandlers = new Map<string, Set<(payload: NotificationPayload) => void>>();
  private logger: RedisLogger;
  private isSubscribed = false;

  constructor(client: RedisClient) {
    this.client = client;
    this.logger = getLogger().child({ component: "RealtimeNotificationManager" });
  }

  /**
   * Initialise le subscriber Pub/Sub
   */
  async initialize(): Promise<void> {
    if (this.isSubscribed) return;

    this.subscriber = this.client.getClient().duplicate();

    this.subscriber.on("message", (channel: string, message: string) => {
      try {
        const notification = JSON.parse(message) as NotificationPayload;
        this.dispatch(channel, notification);
      } catch (err) {
        this.logger.error("Failed to parse notification", { channel, error: String(err) });
      }
    });

    await this.subscriber.subscribe("notifications:broadcast", "notifications:rooms:*");
    this.isSubscribed = true;
    this.logger.info("Realtime notification manager initialized");
  }

  /**
   * Rejoint une room pour recevoir les notifications
   */
  joinRoom(room: string, handler: (payload: NotificationPayload) => void): () => void {
    const roomKey = `room:${room}`;

    if (!this.roomHandlers.has(roomKey)) {
      this.roomHandlers.set(roomKey, new Set());
    }

    this.roomHandlers.get(roomKey)!.add(handler);
    this.logger.debug("Joined room", { room });

    return () => {
      this.roomHandlers.get(roomKey)?.delete(handler);
      if (this.roomHandlers.get(roomKey)?.size === 0) {
        this.roomHandlers.delete(roomKey);
      }
    };
  }

  /**
   * S'abonne aux notifications privées d'un utilisateur
   */
  subscribeToUser(userId: string, handler: (payload: NotificationPayload) => void): () => void {
    if (!this.userHandlers.has(userId)) {
      this.userHandlers.set(userId, new Set());
    }

    this.userHandlers.get(userId)!.add(handler);
    this.logger.debug("Subscribed to user notifications", { userId });

    return () => {
      this.userHandlers.get(userId)?.delete(handler);
    };
  }

  /**
   * Envoie une notification à une room
   */
  async sendToRoom(room: string, notification: Omit<NotificationPayload, "timestamp">): Promise<number> {
    const payload: NotificationPayload = {
      ...notification,
      timestamp: Date.now(),
    };

    return this.client.publish(`notifications:rooms:${room}`, payload);
  }

  /**
   * Broadcast à tous les clients connectés
   */
  async broadcast(notification: Omit<NotificationPayload, "timestamp">): Promise<number> {
    const payload: NotificationPayload = {
      ...notification,
      timestamp: Date.now(),
    };

    return this.client.publish("notifications:broadcast", payload);
  }

  /**
   * Envoie une notification privée à un utilisateur
   */
  async sendToUser(userId: string, notification: Omit<NotificationPayload, "timestamp">): Promise<void> {
    const payload: NotificationPayload = {
      ...notification,
      timestamp: Date.now(),
    };

    // Stocker pour récupération ultérieure si l'utilisateur est offline
    await this.client.setex(
      `notifications:user:${userId}:${Date.now()}`,
      86400, // 24h
      payload
    );

    // Publier pour les instances connectées
    await this.client.publish(`notifications:user:${userId}`, payload);
  }

  /**
   * Récupère les notifications en attente d'un utilisateur
   */
  async getPendingNotifications(userId: string): Promise<NotificationPayload[]> {
    const pattern = `notifications:user:${userId}:*`;
    const keys = await this.client.scanAll(pattern);

    const notifications: NotificationPayload[] = [];
    for (const key of keys) {
      const notif = await this.client.get<NotificationPayload>(key);
      if (notif) {
        notifications.push(notif);
        await this.client.del(key);
      }
    }

    return notifications.sort((a, b) => a.timestamp - b.timestamp);
  }

  private dispatch(channel: string, notification: NotificationPayload): void {
    // Room dispatch
    if (channel.startsWith("notifications:rooms:")) {
      const room = channel.replace("notifications:rooms:", "");
      const handlers = this.roomHandlers.get(`room:${room}`);
      handlers?.forEach((h) => {
        try {
          h(notification);
        } catch (err) {
          this.logger.error("Room handler error", { error: String(err) });
        }
      });
    }

    // Broadcast dispatch
    if (channel === "notifications:broadcast") {
      for (const handlers of this.roomHandlers.values()) {
        handlers.forEach((h) => {
          try {
            h(notification);
          } catch (err) {
            this.logger.error("Broadcast handler error", { error: String(err) });
          }
        });
      }
    }

    // User dispatch
    if (channel.startsWith("notifications:user:")) {
      const userId = channel.replace("notifications:user:", "");
      const handlers = this.userHandlers.get(userId);
      handlers?.forEach((h) => {
        try {
          h(notification);
        } catch (err) {
          this.logger.error("User handler error", { error: String(err) });
        }
      });
    }
  }

  async dispose(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.unsubscribe();
      await this.subscriber.quit();
      this.subscriber = null;
    }
    this.roomHandlers.clear();
    this.userHandlers.clear();
    this.isSubscribed = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADVANCED HELPERS — Intégration des nouvelles fonctionnalités
// ═══════════════════════════════════════════════════════════════════════════════

export const redisAdvancedHelpers = {
  // ─── Streams Event Sourcing ──────────────────────────────────────────────────
  streams: {
    /**
     * Ajoute un événement métier au stream d'audit
     */
    async addAuditEvent(
      eventType: string,
      data: Record<string, unknown>,
      options?: { maxLen?: number }
    ) {
      const streamManager = new RedisStreamManager(getRedisClient());
      return streamManager.addEvent(
        getRedisClient().keys.build(RedisNamespaces.ANALYTICS, "audit"),
        {
          eventType,
          ...data,
          timestamp: Date.now(),
          service: "boutiquecogi3",
        },
        { maxLen: options?.maxLen || 10000, approximate: true }
      );
    },

    /**
     * Ajoute un événement de commande pour traitement asynchrone
     */
    async addOrderEvent(
      orderId: string,
      eventType: "created" | "paid" | "shipped" | "delivered" | "cancelled",
      metadata?: Record<string, unknown>
    ) {
      const streamManager = new RedisStreamManager(getRedisClient());
      return streamManager.addEvent(
        getRedisClient().keys.build(RedisNamespaces.ORDER, "events"),
        {
          orderId,
          eventType,
          ...metadata,
          timestamp: Date.now(),
        },
        { maxLen: 50000, approximate: true }
      );
    },

    /**
     * Crée un consumer group pour le traitement des commandes
     */
    async createOrderConsumerGroup(groupName: string) {
      const streamManager = new RedisStreamManager(getRedisClient());
      const streamKey = getRedisClient().keys.build(RedisNamespaces.ORDER, "events");

      try {
        await streamManager.createConsumerGroup(streamKey, groupName, { mkStream: true });
      } catch (err) {
        // Groupe déjà existant — ignorer
        if ((err as Error).message?.includes("already exists")) {
          return;
        }
        throw err;
      }
    },
  },

  // ─── L1 Cache Integration ──────────────────────────────────────────────────
  l1Cache: {
    private cache: L1CacheManager | null = null;

    getInstance(config?: Partial<L1CacheConfig>): L1CacheManager {
      if (!this.cache) {
        this.cache = new L1CacheManager(config);
      }
      return this.cache;
    },

    /**
     * Récupère une valeur avec cache L1 → L2 (Redis) → DB
     */
    async getOrSet<T>(
      key: string,
      factory: () => Promise<T>,
      options?: { l1TtlMs?: number; l2TtlSeconds?: number }
    ): Promise<T> {
      const l1 = this.getInstance();
      const l2 = getRedisClient();

      // L1 check
      const l1Value = l1.get<T>(key);
      if (l1Value !== undefined) return l1Value;

      // L2 check
      const l2Value = await l2.get<T>(key);
      if (l2Value !== null) {
        l1.set(key, l2Value, options?.l1TtlMs);
        return l2Value;
      }

      // DB
      const value = await factory();

      // Populate L2
      await l2.set(key, value, { ttlSeconds: options?.l2TtlSeconds });

      // Populate L1
      l1.set(key, value, options?.l1TtlMs);

      return value;
    },

    /**
     * Invalide L1 et L2, avec broadcast cross-process
     */
    async invalidate(key: string): Promise<void> {
      const l1 = this.getInstance();
      const l2 = getRedisClient();

      l1.delete(key);
      await l2.del(key);

      // Broadcast invalidation
      await l2.publish("l1-cache:invalidate", key);
    },

    getMetrics() {
      return this.getInstance().getMetrics();
    },
  },

  // ─── Metrics & Monitoring ──────────────────────────────────────────────────
  metrics: {
    private collector: RedisMetricsCollector | null = null;

    getCollector(): RedisMetricsCollector {
      if (!this.collector) {
        this.collector = new RedisMetricsCollector(getRedisClient());
      }
      return this.collector;
    },

    /**
     * Collecte et exporte les métriques au format Prometheus
     */
    async exportPrometheus(): Promise<string> {
      return this.getCollector().exportPrometheus();
    },

    /**
     * Démarre la collecte périodique
     */
    startMonitoring(
      intervalMs: number,
      callback: (metrics: RedisMetrics) => void
    ): () => void {
      return this.getCollector().startPeriodicCollection(intervalMs, callback);
    },
  },

  // ─── Real-time Notifications ───────────────────────────────────────────────
  notifications: {
    private manager: RealtimeNotificationManager | null = null;

    getManager(): RealtimeNotificationManager {
      if (!this.manager) {
        this.manager = new RealtimeNotificationManager(getRedisClient());
      }
      return this.manager;
    },

    async initialize(): Promise<void> {
      await this.getManager().initialize();
    },

    /**
     * Notifie les clients d'un changement de stock
     */
    async stockAlert(productId: string, remainingStock: number): Promise<void> {
      await this.getManager().sendToRoom(`product:${productId}`, {
        type: "STOCK_ALERT",
        payload: { productId, remainingStock, lowStock: remainingStock < 10 },
      });
    },

    /**
     * Notifie d'une nouvelle commande (admin dashboard)
     */
    async newOrder(orderId: string, amount: number): Promise<void> {
      await this.getManager().sendToRoom("admin:orders", {
        type: "NEW_ORDER",
        payload: { orderId, amount, timestamp: Date.now() },
      });
    },

    /**
     * Notifie un utilisateur spécifique
     */
    async notifyUser(userId: string, type: string, payload: unknown): Promise<void> {
      await this.getManager().sendToUser(userId, {
        type,
        payload,
      });
    },

    /**
     * Broadcast système (maintenance, promotions)
     */
    async systemBroadcast(message: string, priority: "low" | "medium" | "high" = "medium") {
      await this.getManager().broadcast({
        type: "SYSTEM_MESSAGE",
        payload: { message, priority },
      });
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES EXPORTS (supplémentaires)
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  RedisClusterConfig,
  StreamMessage,
  StreamConsumerGroup,
  L1CacheConfig,
  RedisMetrics,
  NotificationPayload,
  RoomSubscription,
};

export {
  RedisClusterClient,
  RedisStreamManager,
  L1CacheManager,
  RedisMetricsCollector,
  RealtimeNotificationManager,
};