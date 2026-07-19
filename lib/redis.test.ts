// lib/redis.test.ts
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @fileoverview Tests unitaires du client Redis — Boutiquecogi3
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Couverture :
 * - Configuration & validation Zod
 * - Circuit Breaker (états CLOSED/OPEN/HALF_OPEN)
 * - Opérations Redis (String, Hash, List, Set, Sorted Set)
 * - Distributed Lock (acquireLock / withLock)
 * - Rate Limiting (fixed & sliding window)
 * - Cache Aside Pattern
 * - Helpers métier (session, cart, product, inventory, rbac, etc.)
 * - Mock Redis (sans dépendance externe)
 * - Logging injection
 *
 * Stack: Vitest | Next.js 16.2.9 | ioredis v5 | Zod | UUID v7
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  RedisClient,
  RedisError,
  RedisConnectionError,
  RedisCircuitOpenError,
  RedisSerializationError,
  RedisNamespaces,
  KeyBuilder,
  Serializer,
  getRedisClient,
  resetRedisClient,
  redisHelpers,
  setRedisLogger,
  type RedisLogger,
} from "./redis";
import { createMockRedisClient, createMockLogger } from "./redis.mock";

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES & UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 1 : Configuration & Singleton
// ═══════════════════════════════════════════════════════════════════════════════

describe("RedisClient — Configuration & Singleton", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  afterEach(() => {
    resetRedisClient();
  });

  it("devrait créer une instance Singleton", () => {
    const client1 = RedisClient.getInstance();
    const client2 = RedisClient.getInstance();
    expect(client1).toBe(client2);
  });

  it("devrait valider la configuration avec Zod", () => {
    expect(() =>
      RedisClient.getInstance({
        config: { port: 999999 }, // invalide (>65535)
      })
    ).toThrow(RedisError);
  });

  it("devrait accepter une configuration valide", () => {
    const client = RedisClient.getInstance({
      config: {
        host: "localhost",
        port: 6379,
        db: 0,
      },
    });
    expect(client).toBeInstanceOf(RedisClient);
  });

  it("devrait retourner les métriques correctement", () => {
    const { client } = createMockRedisClient();
    const metrics = client.getMetrics();
    expect(metrics).toHaveProperty("isConnected");
    expect(metrics).toHaveProperty("circuitBreaker");
    expect(metrics).toHaveProperty("config");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 2 : Circuit Breaker
// ═══════════════════════════════════════════════════════════════════════════════

describe("RedisClient — Circuit Breaker", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait accepter les opérations en état CLOSED", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.set("key", "value");
    const value = await client.get("key");
    expect(value).toBe("value");
  });

  it("devrait ouvrir le circuit après 5 échecs consécutifs", async () => {
    const { client } = createMockRedisClient();

    // Forcer des échecs en manipulant le circuit breaker
    // @ts-expect-error
    const cb = client.circuitBreaker;
    for (let i = 0; i < 5; i++) {
      cb.recordFailure();
    }

    expect(cb.getState()).toBe("OPEN");

    await expect(client.get("key")).rejects.toThrow(RedisCircuitOpenError);
  });

  it("devrait passer de OPEN à HALF_OPEN après le timeout", async () => {
    const { client } = createMockRedisClient({
      circuitBreaker: { resetTimeoutMs: 50 },
    });

    // @ts-expect-error
    const cb = client.circuitBreaker;
    for (let i = 0; i < 5; i++) cb.recordFailure();
    expect(cb.getState()).toBe("OPEN");

    await sleep(60);
    expect(cb.canExecute()).toBe(true);
    expect(cb.getState()).toBe("HALF_OPEN");
  });

  it("devrait fermer le circuit après 3 succès en HALF_OPEN", async () => {
    const { client } = createMockRedisClient({
      circuitBreaker: { halfOpenMaxCalls: 3 },
    });

    // @ts-expect-error
    const cb = client.circuitBreaker;
    cb.state = "HALF_OPEN";
    cb.halfOpenCalls = 0;

    cb.recordSuccess();
    cb.recordSuccess();
    cb.recordSuccess();

    expect(cb.getState()).toBe("CLOSED");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 3 : Opérations String
// ═══════════════════════════════════════════════════════════════════════════════

describe("RedisClient — Opérations String", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait set/get une valeur string", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.set("test:key", "hello");
    const value = await client.get("test:key");
    expect(value).toBe("hello");
  });

  it("devrait set/get un objet JSON", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    const data = { name: "iPhone 15", price: 25000 };
    await client.set("test:product", data);
    const retrieved = await client.get<typeof data>("test:product");
    expect(retrieved).toEqual(data);
  });

  it("devrait set avec TTL", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.set("test:ttl", "value", { ttlSeconds: 1 });
    let value = await client.get("test:ttl");
    expect(value).toBe("value");

    await sleep(1100);
    value = await client.get("test:ttl");
    expect(value).toBeNull();
  });

  it("devrait setex avec TTL", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.setex("test:setex", 2, "value");
    const ttl = await client.ttl("test:setex");
    expect(ttl).toBeGreaterThan(0);
  });

  it("devrait supprimer une clé", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.set("test:del", "value");
    const deleted = await client.del("test:del");
    expect(deleted).toBe(1);

    const value = await client.get("test:del");
    expect(value).toBeNull();
  });

  it("devrait vérifier l'existence d'une clé", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.set("test:exists", "value");
    const exists = await client.exists("test:exists", "test:missing");
    expect(exists).toBe(1);
  });

  it("devrait incr/incrBy correctement", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.set("test:counter", 10);
    const val1 = await client.incr("test:counter");
    expect(val1).toBe(11);

    const val2 = await client.incrBy("test:counter", 5);
    expect(val2).toBe(16);
  });

  it("devrait decr/decrBy correctement", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.set("test:counter", 10);
    const val1 = await client.decr("test:counter");
    expect(val1).toBe(9);

    const val2 = await client.decrBy("test:counter", 3);
    expect(val2).toBe(6);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 4 : Opérations Hash (Panier)
// ═══════════════════════════════════════════════════════════════════════════════

describe("RedisClient — Opérations Hash (Panier)", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait hSet/hGet un champ individuel", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.hSet("cart:user-1", "item-1", { productId: "p1", quantity: 2 });
    const item = await client.hGet<{ productId: string; quantity: number }>(
      "cart:user-1",
      "item-1"
    );
    expect(item).toEqual({ productId: "p1", quantity: 2 });
  });

  it("devrait hGetAll retourner tout le hash", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.hSet("cart:user-1", "item-1", { productId: "p1", quantity: 2 });
    await client.hSet("cart:user-1", "item-2", { productId: "p2", quantity: 1 });

    const cart = await client.hGetAll<{ productId: string; quantity: number }>(
      "cart:user-1"
    );
    expect(cart).toHaveProperty("item-1");
    expect(cart).toHaveProperty("item-2");
    expect(cart?.["item-1"]).toEqual({ productId: "p1", quantity: 2 });
  });

  it("devrait hDel supprimer un champ", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.hSet("cart:user-1", "item-1", { productId: "p1", quantity: 2 });
    const deleted = await client.hDel("cart:user-1", "item-1");
    expect(deleted).toBe(1);

    const item = await client.hGet("cart:user-1", "item-1");
    expect(item).toBeNull();
  });

  it("devrait hExists vérifier l'existence d'un champ", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.hSet("cart:user-1", "item-1", { productId: "p1", quantity: 2 });
    const exists = await client.hExists("cart:user-1", "item-1");
    expect(exists).toBe(true);

    const missing = await client.hExists("cart:user-1", "item-99");
    expect(missing).toBe(false);
  });

  it("devrait hIncrBy incrémenter un champ numérique", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.hSet("cart:user-1", "item-1", { quantity: 2 });
    const newQty = await client.hIncrBy("cart:user-1", "item-1", 3);
    expect(newQty).toBe(5);
  });

  it("devrait hSetMultiple définir plusieurs champs", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.hSetMultiple("cart:user-1", {
      "item-1": { productId: "p1", quantity: 2 },
      "item-2": { productId: "p2", quantity: 3 },
    });

    const cart = await client.hGetAll("cart:user-1");
    expect(Object.keys(cart ?? {})).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 5 : Opérations List
// ═══════════════════════════════════════════════════════════════════════════════

describe("RedisClient — Opérations List", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait lPush/rPush des éléments", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.lPush("list:test", "a", "b");
    await client.rPush("list:test", "c", "d");

    const items = await client.lRange<string>("list:test", 0, -1);
    expect(items).toEqual(["b", "a", "c", "d"]);
  });

  it("devrait lPop/rPop des éléments", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.rPush("list:test", "a", "b", "c");

    const left = await client.lPop<string>("list:test");
    expect(left).toBe("a");

    const right = await client.rPop<string>("list:test");
    expect(right).toBe("c");
  });

  it("devrait lTrim tronquer la liste", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.rPush("list:test", "a", "b", "c", "d", "e");
    await client.lTrim("list:test", 1, 3);

    const items = await client.lRange<string>("list:test", 0, -1);
    expect(items).toEqual(["b", "c", "d"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 6 : Opérations Set
// ═══════════════════════════════════════════════════════════════════════════════

describe("RedisClient — Opérations Set", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait sAdd/sMembers gérer un ensemble", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.sAdd("set:test", "a", "b", "c");
    const members = await client.sMembers<string>("set:test");
    expect(members).toContain("a");
    expect(members).toContain("b");
    expect(members).toContain("c");
  });

  it("devrait sIsMember vérifier l'appartenance", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.sAdd("set:test", "a", "b");
    const isMember = await client.sIsMember("set:test", "a");
    expect(isMember).toBe(true);

    const notMember = await client.sIsMember("set:test", "z");
    expect(notMember).toBe(false);
  });

  it("devrait sRem supprimer des membres", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.sAdd("set:test", "a", "b", "c");
    const removed = await client.sRem("set:test", "a", "b");
    expect(removed).toBe(2);

    const members = await client.sMembers<string>("set:test");
    expect(members).toEqual(["c"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 7 : Opérations Sorted Set
// ═══════════════════════════════════════════════════════════════════════════════

describe("RedisClient — Opérations Sorted Set", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait zAdd/zRange gérer un sorted set", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.zAdd("zset:test", [
      { score: 10, member: "a" },
      { score: 20, member: "b" },
      { score: 5, member: "c" },
    ]);

    const members = await client.zRange<string>("zset:test", 0, -1);
    expect(members).toEqual(["c", "a", "b"]);
  });

  it("devrait zRange avec withScores", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.zAdd("zset:test", [
      { score: 10, member: "a" },
      { score: 20, member: "b" },
    ]);

    const members = await client.zRange<string>("zset:test", 0, -1, {
      withScores: true,
    });
    expect(members).toEqual([
      { member: "a", score: 10 },
      { member: "b", score: 20 },
    ]);
  });

  it("devrait zRange rev retourner en ordre décroissant", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.zAdd("zset:test", [
      { score: 10, member: "a" },
      { score: 20, member: "b" },
      { score: 5, member: "c" },
    ]);

    const members = await client.zRange<string>("zset:test", 0, -1, {
      rev: true,
    });
    expect(members).toEqual(["b", "a", "c"]);
  });

  it("devrait zScore retourner le score", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.zAdd("zset:test", [{ score: 42, member: "a" }]);
    const score = await client.zScore("zset:test", "a");
    expect(score).toBe(42);
  });

  it("devrait zRem supprimer des membres", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.zAdd("zset:test", [
      { score: 10, member: "a" },
      { score: 20, member: "b" },
    ]);

    const removed = await client.zRem("zset:test", "a");
    expect(removed).toBe(1);

    const members = await client.zRange<string>("zset:test", 0, -1);
    expect(members).toEqual(["b"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 8 : Distributed Lock (Sécurité du stock)
// ═══════════════════════════════════════════════════════════════════════════════

describe("RedisClient — Distributed Lock", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait acquérir un verrou avec succès", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    const lock = await client.acquireLock("lock:test", 10);
    expect(lock).not.toBeNull();
    expect(lock?.token).toBeDefined();

    await lock?.release();
  });

  it("devrait échouer si le verrou est déjà pris", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    const lock1 = await client.acquireLock("lock:test", 10);
    expect(lock1).not.toBeNull();

    const lock2 = await client.acquireLock("lock:test", 10, { maxRetries: 1 });
    expect(lock2).toBeNull();

    await lock1?.release();
  });

  it("devrait exécuter withLock et libérer automatiquement", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    const result = await client.withLock("lock:test", 10, async () => {
      return "success";
    });

    expect(result).toBe("success");

    // Le verrou devrait être libéré
    const lock = await client.acquireLock("lock:test", 10);
    expect(lock).not.toBeNull();
    await lock?.release();
  });

  it("devrait libérer le verrou même en cas d'erreur", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await expect(
      client.withLock("lock:test", 10, async () => {
        throw new Error("test error");
      })
    ).rejects.toThrow("test error");

    // Le verrou devrait être libéré
    const lock = await client.acquireLock("lock:test", 10);
    expect(lock).not.toBeNull();
    await lock?.release();
  });

  it("devrait empêcher le fuzzy deletion (token mismatch)", async () => {
    const { client, mockRedis, reset } = createMockRedisClient();
    reset();

    const lock = await client.acquireLock("lock:test", 10);
    expect(lock).not.toBeNull();

    // Simuler un vol de verrou (expiration + réacquisition)
    await mockRedis.del("lock:test");
    const newLock = await client.acquireLock("lock:test", 10);
    expect(newLock).not.toBeNull();

    // L'ancien release ne devrait pas supprimer le nouveau verrou
    await lock?.release();

    const currentToken = await mockRedis.get("lock:test");
    expect(currentToken).toBe(newLock?.token);

    await newLock?.release();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 9 : Rate Limiting
// ═══════════════════════════════════════════════════════════════════════════════

describe("RedisClient — Rate Limiting", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait permettre les requêtes sous la limite", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    const result = await client.rateLimit("ratelimit:test", {
      windowSeconds: 60,
      maxRequests: 5,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("devrait bloquer après dépassement de la limite", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    for (let i = 0; i < 5; i++) {
      await client.rateLimit("ratelimit:test", {
        windowSeconds: 60,
        maxRequests: 5,
      });
    }

    const result = await client.rateLimit("ratelimit:test", {
      windowSeconds: 60,
      maxRequests: 5,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("devrait sliding window rate limit fonctionner", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    const result = await client.slidingWindowRateLimit("ratelimit:slide", {
      windowSeconds: 60,
      maxRequests: 3,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 10 : Cache Aside Pattern
// ═══════════════════════════════════════════════════════════════════════════════

describe("RedisClient — Cache Aside Pattern", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait appeler la factory si cache miss", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    const factory = vi.fn().mockResolvedValue({ data: "fresh" });
    const result = await client.getOrSet("cache:test", factory, {
      ttlSeconds: 60,
    });

    expect(factory).toHaveBeenCalledOnce();
    expect(result).toEqual({ data: "fresh" });
  });

  it("devrait retourner le cache si cache hit", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.set("cache:test", { data: "cached" });

    const factory = vi.fn().mockResolvedValue({ data: "fresh" });
    const result = await client.getOrSet("cache:test", factory);

    expect(factory).not.toHaveBeenCalled();
    expect(result).toEqual({ data: "cached" });
  });

  it("devrait invalider par pattern", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.set("cache:a", "1");
    await client.set("cache:b", "2");
    await client.set("other:c", "3");

    const deleted = await client.invalidatePattern("cache:*");
    expect(deleted).toBe(2);

    expect(await client.get("cache:a")).toBeNull();
    expect(await client.get("cache:b")).toBeNull();
    expect(await client.get("other:c")).toBe("3");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 11 : Helpers Métier
// ═══════════════════════════════════════════════════════════════════════════════

describe("redisHelpers — Sessions", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait set/get/del une session", async () => {
    const { reset } = createMockRedisClient();
    reset();

    const sessionData = {
      userId: "user-123",
      email: "test@example.com",
      roleLevel: 3,
      expiresAt: Date.now() + 3600000,
    };

    await redisHelpers.session.set("token-abc", sessionData, 3600);
    const retrieved = await redisHelpers.session.get("token-abc");
    expect(retrieved).toEqual(sessionData);

    await redisHelpers.session.del("token-abc");
    const deleted = await redisHelpers.session.get("token-abc");
    expect(deleted).toBeNull();
  });
});

describe("redisHelpers — Panier (Hash)", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait ajouter/lire des articles au panier", async () => {
    const { reset } = createMockRedisClient();
    reset();

    await redisHelpers.cart.addItem("user-1", "item-1", {
      productId: "prod-1",
      quantity: 2,
      addedAt: Date.now(),
    });

    const cart = await redisHelpers.cart.get("user-1");
    expect(cart).toHaveProperty("item-1");
    expect(cart?.["item-1"].quantity).toBe(2);
  });

  it("devrait supprimer un article du panier", async () => {
    const { reset } = createMockRedisClient();
    reset();

    await redisHelpers.cart.addItem("user-1", "item-1", {
      productId: "prod-1",
      quantity: 2,
      addedAt: Date.now(),
    });

    await redisHelpers.cart.removeItem("user-1", "item-1");
    const cart = await redisHelpers.cart.get("user-1");
    expect(cart).toBeNull();
  });

  it("devrait incrémenter la quantité sans lire tout le panier", async () => {
    const { reset } = createMockRedisClient();
    reset();

    await redisHelpers.cart.addItem("user-1", "item-1", {
      productId: "prod-1",
      quantity: 2,
      addedAt: Date.now(),
    });

    const updated = await redisHelpers.cart.incrementQuantity("user-1", "item-1", 3);
    expect(updated?.quantity).toBe(5);
  });
});

describe("redisHelpers — Inventaire (Stock)", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait set/get le stock", async () => {
    const { reset } = createMockRedisClient();
    reset();

    await redisHelpers.inventory.setStock("prod-1", 100);
    const stock = await redisHelpers.inventory.getStock("prod-1");
    expect(stock).toBe(100);
  });

  it("devrait décrémenter le stock de manière atomique", async () => {
    const { reset } = createMockRedisClient();
    reset();

    await redisHelpers.inventory.setStock("prod-1", 10);
    const remaining = await redisHelpers.inventory.decrementStock("prod-1", 3);
    expect(remaining).toBe(7);
  });

  it("devrait décrémenter le stock en toute sécurité avec lock", async () => {
    const { reset } = createMockRedisClient();
    reset();

    await redisHelpers.inventory.setStock("prod-1", 5);
    const result = await redisHelpers.inventory.decrementStockSafe("prod-1", 3);

    expect(result.success).toBe(true);
    expect(result.remainingStock).toBe(2);
  });

  it("devrait refuser si stock insuffisant (safe)", async () => {
    const { reset } = createMockRedisClient();
    reset();

    await redisHelpers.inventory.setStock("prod-1", 2);
    const result = await redisHelpers.inventory.decrementStockSafe("prod-1", 5);

    expect(result.success).toBe(false);
    expect(result.remainingStock).toBe(2);
  });
});

describe("redisHelpers — RBAC", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait cache permissions et restrictions", async () => {
    const { reset } = createMockRedisClient();
    reset();

    await redisHelpers.rbac.setPermissions(3, ["product:read", "order:read"]);
    await redisHelpers.rbac.setRestrictions(3, { canDelete: false, canExport: true });

    const perms = await redisHelpers.rbac.getPermissions(3);
    expect(perms).toEqual(["product:read", "order:read"]);

    const restrictions = await redisHelpers.rbac.getRestrictions(3);
    expect(restrictions).toEqual({ canDelete: false, canExport: true });
  });

  it("devrait invalider le cache RBAC", async () => {
    const { reset } = createMockRedisClient();
    reset();

    await redisHelpers.rbac.setPermissions(3, ["product:read"]);
    await redisHelpers.rbac.invalidateRole(3);

    const perms = await redisHelpers.rbac.getPermissions(3);
    expect(perms).toBeNull();
  });
});

describe("redisHelpers — Commandes CinetPay", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait dédupliquer les webhooks", async () => {
    const { reset } = createMockRedisClient();
    reset();

    const isProcessed1 = await redisHelpers.order.isWebhookProcessed("txn-123");
    expect(isProcessed1).toBe(false);

    await redisHelpers.order.markWebhookProcessed("txn-123");
    const isProcessed2 = await redisHelpers.order.isWebhookProcessed("txn-123");
    expect(isProcessed2).toBe(true);
  });

  it("devrait gérer le statut des commandes", async () => {
    const { reset } = createMockRedisClient();
    reset();

    await redisHelpers.order.setStatus("order-1", "paid");
    const status = await redisHelpers.order.getStatus("order-1");
    expect(status).toBe("paid");
  });
});

describe("redisHelpers — Feature Flags", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait toggle un feature flag", async () => {
    const { reset } = createMockRedisClient();
    reset();

    const initial = await redisHelpers.featureFlag.isEnabled("new-checkout");
    expect(initial).toBe(false);

    await redisHelpers.featureFlag.set("new-checkout", true);
    const enabled = await redisHelpers.featureFlag.isEnabled("new-checkout");
    expect(enabled).toBe(true);

    const toggled = await redisHelpers.featureFlag.toggle("new-checkout");
    expect(toggled).toBe(false);
  });
});

describe("redisHelpers — Analytics", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait tracker les page views", async () => {
    const { reset } = createMockRedisClient();
    reset();

    await redisHelpers.analytics.incrementPageView("/products");
    await redisHelpers.analytics.incrementPageView("/products");
    await redisHelpers.analytics.incrementPageView("/products");

    const views = await redisHelpers.analytics.getPageViews("/products");
    expect(views).toBe(3);
  });

  it("devrait tracker des événements", async () => {
    const { reset } = createMockRedisClient();
    reset();

    await redisHelpers.analytics.trackEvent("purchase", { amount: 25000 });
    await redisHelpers.analytics.trackEvent("purchase", { amount: 30000 });

    const events = await redisHelpers.analytics.getEvents("purchase");
    expect(events).toHaveLength(2);
    expect(events[0]).toHaveProperty("amount");
  });
});

describe("redisHelpers — Recherche", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait suggérer des requêtes", async () => {
    const { reset } = createMockRedisClient();
    reset();

    await redisHelpers.search.addSuggestion("iphone 15", 10);
    await redisHelpers.search.addSuggestion("iphone 14", 5);
    await redisHelpers.search.addSuggestion("samsung", 3);

    const suggestions = await redisHelpers.search.getSuggestions("iph", 2);
    expect(suggestions).toContain("iphone 15");
    expect(suggestions).toContain("iphone 14");
  });
});

describe("redisHelpers — Recommandations", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait stocker et récupérer des produits similaires", async () => {
    const { reset } = createMockRedisClient();
    reset();

    await redisHelpers.recommendation.setSimilar("prod-1", ["prod-2", "prod-3", "prod-4"]);
    const similar = await redisHelpers.recommendation.getSimilar("prod-1", 2);

    expect(similar).toHaveLength(2);
    expect(similar).toContain("prod-2");
  });
});

describe("redisHelpers — Vérification Email", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait stocker et récupérer un token de vérification", async () => {
    const { reset } = createMockRedisClient();
    reset();

    await redisHelpers.verification.storeEmailToken("token-xyz", "user-1", 3600);
    const data = await redisHelpers.verification.getEmailToken("token-xyz");

    expect(data).toHaveProperty("userId", "user-1");
    expect(data).toHaveProperty("createdAt");
  });
});

describe("redisHelpers — OAuth State", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait stocker et vérifier un state OAuth (suppression après lecture)", async () => {
    const { reset } = createMockRedisClient();
    reset();

    await redisHelpers.oauth.storeState("state-abc", "google", "/callback", 600);
    const data = await redisHelpers.oauth.verifyState("state-abc");

    expect(data).toHaveProperty("provider", "google");
    expect(data).toHaveProperty("redirectUrl", "/callback");

    // Devrait être supprimé après lecture
    const deleted = await redisHelpers.oauth.verifyState("state-abc");
    expect(deleted).toBeNull();
  });
});

describe("redisHelpers — Catégories", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait cache l'arbre et la liste des catégories", async () => {
    const { reset } = createMockRedisClient();
    reset();

    const tree = { electronics: { phones: {}, laptops: {} } };
    await redisHelpers.category.setTree(tree);

    const retrieved = await redisHelpers.category.getTree();
    expect(retrieved).toEqual(tree);

    const list = [{ id: "1", name: "Electronics" }];
    await redisHelpers.category.setList(list);

    const listRetrieved = await redisHelpers.category.getList();
    expect(listRetrieved).toEqual(list);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 12 : Transactions (Multi/Exec)
// ═══════════════════════════════════════════════════════════════════════════════

describe("RedisClient — Transactions", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait exécuter une transaction atomique", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    const results = await client.multi((pipeline) => {
      pipeline.set("txn:a", "1");
      pipeline.set("txn:b", "2");
      pipeline.get("txn:a");
    });

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual([null, "OK"]);
    expect(results[1]).toEqual([null, "OK"]);
    expect(results[2]).toEqual([null, "1"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 13 : Pub/Sub
// ═══════════════════════════════════════════════════════════════════════════════

describe("RedisClient — Pub/Sub", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait publier et recevoir des messages", async () => {
    const { client, mockRedis, reset } = createMockRedisClient();
    reset();

    const messages: Array<{ channel: string; message: unknown }> = [];

    const unsubscribe = client.subscribe(["channel:test"], (channel, message) => {
      messages.push({ channel, message });
    });

    // Simuler la réception d'un message
    mockRedis.emit("message", "channel:test", JSON.stringify({ data: "hello" }));

    expect(messages).toHaveLength(1);
    expect(messages[0].message).toEqual({ data: "hello" });

    unsubscribe();
  });

  it("devrait publier un message", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    const count = await client.publish("channel:test", { data: "hello" });
    expect(count).toBe(0); // Pas d'abonnés dans le mock
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 14 : Serialization
// ═══════════════════════════════════════════════════════════════════════════════

describe("Serializer", () => {
  it("devrait sérialiser/désérialiser correctement", () => {
    const data = { nested: { array: [1, 2, 3] }, date: new Date().toISOString() };
    const serialized = Serializer.serialize(data);
    const deserialized = Serializer.deserialize<typeof data>(serialized);
    expect(deserialized).toEqual(data);
  });

  it("devrait retourner null pour une valeur null", () => {
    const result = Serializer.deserialize<string>(null);
    expect(result).toBeNull();
  });

  it("devrait lever une erreur pour un JSON invalide", () => {
    expect(() => Serializer.deserialize("not json")).toThrow(
      RedisSerializationError
    );
  });

  it("devrait sérialiser avec métadonnées", () => {
    const data = { test: true };
    const serialized = Serializer.serializeWithMetadata(data);
    const { data: deserialized, meta } = Serializer.deserializeWithMetadata(serialized);

    expect(deserialized).toEqual(data);
    expect(meta).toHaveProperty("v", 1);
    expect(meta).toHaveProperty("t");
    expect(meta).toHaveProperty("s");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 15 : KeyBuilder
// ═══════════════════════════════════════════════════════════════════════════════

describe("KeyBuilder", () => {
  it("devrait construire des clés correctement", () => {
    const kb = new KeyBuilder("boutiquecogi3:");
    const key = kb.build(RedisNamespaces.PRODUCT, "123");
    expect(key).toBe("boutiquecogi3:product:123");
  });

  it("devrait sanitiser les segments", () => {
    const kb = new KeyBuilder("boutiquecogi3:");
    const key = kb.build(RedisNamespaces.PRODUCT, "item: with space");
    expect(key).toBe("boutiquecogi3:product:item__with_space");
  });

  it("devrait générer des patterns", () => {
    const kb = new KeyBuilder("boutiquecogi3:");
    const pattern = kb.pattern(RedisNamespaces.PRODUCT, "*");
    expect(pattern).toBe("boutiquecogi3:product:*");
  });

  it("devrait rejeter une clé sans segment", () => {
    const kb = new KeyBuilder("boutiquecogi3:");
    expect(() => kb.build(RedisNamespaces.PRODUCT)).toThrow(RedisError);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 16 : Logging Injection
// ═══════════════════════════════════════════════════════════════════════════════

describe("RedisClient — Logging", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait logger les opérations avec le mock logger", async () => {
    const { client, logger, reset } = createMockRedisClient();
    reset();

    await client.set("log:test", "value");

    const successLogs = logger.logs.filter((l) =>
      l.message.includes("Operation succeeded")
    );
    expect(successLogs.length).toBeGreaterThan(0);
    expect(successLogs[0].meta).toHaveProperty("operation");
  });

  it("devrait logger les erreurs", async () => {
    const { client, logger, reset } = createMockRedisClient();
    reset();

    // Forcer le circuit breaker en OPEN
    // @ts-expect-error
    const cb = client.circuitBreaker;
    for (let i = 0; i < 5; i++) cb.recordFailure();

    await expect(client.get("key")).rejects.toThrow();

    const errorLogs = logger.logs.filter((l) => l.level === "error");
    expect(errorLogs.length).toBeGreaterThan(0);
  });

  it("devrait accepter un logger externe via setRedisLogger", () => {
    const externalLogs: Array<{ level: string; message: string }> = [];

    const externalLogger: RedisLogger = {
      debug: (msg) => externalLogs.push({ level: "debug", message: msg }),
      info: (msg) => externalLogs.push({ level: "info", message: msg }),
      warn: (msg) => externalLogs.push({ level: "warn", message: msg }),
      error: (msg) => externalLogs.push({ level: "error", message: msg }),
      child: () => externalLogger,
    };

    setRedisLogger(externalLogger);

    // Créer un nouveau client pour utiliser le logger injecté
    resetRedisClient();
    const { reset } = createMockRedisClient();
    reset();

    expect(externalLogs.some((l) => l.message.includes("Client ready"))).toBe(
      true
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 17 : Scan & Pattern Matching
// ═══════════════════════════════════════════════════════════════════════════════

describe("RedisClient — Scan & Pattern Matching", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait scanner toutes les clés par pattern", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.set("scan:a", "1");
    await client.set("scan:b", "2");
    await client.set("other:c", "3");

    const keys = await client.scanAll("scan:*");
    expect(keys).toHaveLength(2);
    expect(keys).toContain("scan:a");
    expect(keys).toContain("scan:b");
  });

  it("devrait utiliser keys pour un pattern simple", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    await client.set("keys:a", "1");
    await client.set("keys:b", "2");

    const keys = await client.keys("keys:*");
    expect(keys).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 18 : Health Check
// ═══════════════════════════════════════════════════════════════════════════════

describe("RedisClient — Health Check", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait retourner healthy quand connecté", async () => {
    const { client } = createMockRedisClient();
    expect(client.isHealthy()).toBe(true);
  });

  it("devrait retourner unhealthy quand circuit breaker est OPEN", async () => {
    const { client } = createMockRedisClient();

    // @ts-expect-error
    const cb = client.circuitBreaker;
    for (let i = 0; i < 5; i++) cb.recordFailure();

    expect(client.isHealthy()).toBe(false);
  });

  it("devrait répondre au ping", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    const pong = await client.ping();
    expect(pong).toBe("PONG");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 19 : Edge Cases & Robustesse
// ═══════════════════════════════════════════════════════════════════════════════

describe("RedisClient — Edge Cases", () => {
  beforeEach(() => {
    resetRedisClient();
  });

  it("devrait gérer del sans clés", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    const result = await client.del();
    expect(result).toBe(0);
  });

  it("devrait gérer get sur une clé inexistante", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    const value = await client.get("nonexistent");
    expect(value).toBeNull();
  });

  it("devrait gérer hGetAll sur un hash inexistant", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    const value = await client.hGetAll("nonexistent");
    expect(value).toBeNull();
  });

  it("devrait gérer lRange sur une liste inexistante", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    const value = await client.lRange<string>("nonexistent", 0, -1);
    expect(value).toEqual([]);
  });

  it("devrait gérer sPop sur un set inexistant", async () => {
    const { client, reset } = createMockRedisClient();
    reset();

    const value = await client.sPop<string>("nonexistent");
    expect(value).toBeNull();
  });
});
