// lib/redis/index.ts
// ============================================
// REDIS CLIENT & UTILITIES FOR E-COMMERCE
// ============================================
// Pattern Singleton : Évite de créer une nouvelle connexion Redis à chaque requête
// Hashes pour le Panier : Utilisation de HSET pour modifications atomiques
// Sécurité du Stock : Verrous distribués pour éviter les stocks négatifs
// Gestion des erreurs : RetryStrategy pour une reconnexion automatique

import Redis from "ioredis";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis as UpstashRedis } from "@upstash/redis";

// ───────────────────────────────────────────
// 1. CONFIGURATION
// ───────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";
const REDIS_DB = parseInt(process.env.REDIS_DB || "0", 10);
const REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX || "ecom:";
const REDIS_ENABLED = process.env.REDIS_ENABLED !== "false";
const REDIS_RETRY_DELAY = parseInt(process.env.REDIS_RETRY_DELAY || "100", 10);
const REDIS_MAX_RETRIES = parseInt(process.env.REDIS_MAX_RETRIES || "10", 10);

// ───────────────────────────────────────────
// 2. SINGLETON REDIS CLIENT
// ───────────────────────────────────────────

/**
 * Pattern Singleton : Une seule instance de Redis est partagée dans toute l'application
 * Évite la création de multiples connexions à chaque requête
 */
class RedisClient {
  private static instance: RedisClient;
  private client: Redis | null = null;
  private upstashClient: UpstashRedis | null = null;
  private isConnected = false;
  private isUpstash = false;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private constructor() {
    // Initialisation privée pour le Singleton
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  /**
   * Stratégie de reconnexion automatique avec backoff exponentiel
   * Gestion des erreurs : Si Redis redémarre, le backend attend patiemment
   */
  private getRetryStrategy() {
    return (times: number): number => {
      this.reconnectAttempts = times;
      
      if (times > REDIS_MAX_RETRIES) {
        console.error(`❌ Redis: Maximum retries (${REDIS_MAX_RETRIES}) reached. Giving up.`);
        return null; // Arrête les tentatives
      }

      // Backoff exponentiel avec jitter pour éviter les tempêtes de reconnexion
      const delay = Math.min(
        REDIS_RETRY_DELAY * Math.pow(1.5, times - 1) + Math.random() * 100,
        30000 // Max 30 secondes
      );
      
      console.warn(`⚠️ Redis: Reconnection attempt ${times}/${REDIS_MAX_RETRIES} in ${Math.round(delay)}ms`);
      return delay;
    };
  }

  public async connect(): Promise<Redis | UpstashRedis> {
    if (!REDIS_ENABLED) {
      console.warn("⚠️ Redis is disabled. Using in-memory fallback.");
      return this.getFallbackClient();
    }

    if (this.client && this.isConnected) {
      return this.client;
    }

    if (this.upstashClient) {
      return this.upstashClient;
    }

    try {
      // Vérifier si on utilise Upstash (Redis Cloud)
      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        this.isUpstash = true;
        this.upstashClient = new UpstashRedis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
          automaticDeserialization: true,
        });
        console.log("✅ Redis (Upstash) connected successfully");
        return this.upstashClient;
      }

      // Redis local ou hébergé avec stratégie de reconnexion
      this.client = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        password: REDIS_PASSWORD || undefined,
        db: REDIS_DB,
        keyPrefix: REDIS_KEY_PREFIX,
        retryStrategy: this.getRetryStrategy(),
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
        keepAlive: 30000, // Keep-alive toutes les 30 secondes
        connectTimeout: 10000,
        commandTimeout: 5000,
      });

      // Événements de connexion
      this.client.on("connect", () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log("✅ Redis connected successfully");
      });

      this.client.on("ready", () => {
        this.isConnected = true;
        console.log("✅ Redis ready");
      });

      this.client.on("error", (error) => {
        console.error("❌ Redis error:", error.message);
        this.isConnected = false;
      });

      this.client.on("close", () => {
        this.isConnected = false;
        console.warn("⚠️ Redis connection closed");
      });

      this.client.on("reconnecting", () => {
        console.log("🔄 Redis reconnecting...");
      });

      this.client.on("end", () => {
        this.isConnected = false;
        console.warn("⚠️ Redis connection ended");
      });

      // Tester la connexion
      await this.client.ping();
      this.isConnected = true;
      return this.client;
    } catch (error) {
      console.error("❌ Failed to connect to Redis:", error);
      this.isConnected = false;
      
      // Si la connexion échoue, on tente avec le fallback
      return this.getFallbackClient();
    }
  }

  /**
   * Fallback en mémoire pour le développement ou quand Redis est indisponible
   */
  private getFallbackClient(): Redis {
    if (!this.client) {
      console.warn("⚠️ Using Redis fallback (in-memory) - Data will not persist");
      this.client = new Redis({
        lazyConnect: true,
        retryStrategy: () => null, // Pas de reconnexion en fallback
        maxRetriesPerRequest: 0,
      });
    }
    return this.client;
  }

  public getClient(): Redis | UpstashRedis {
    if (!this.client && !this.upstashClient) {
      throw new Error("Redis not connected. Call connect() first.");
    }
    return this.upstashClient || this.client!;
  }

  public async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      this.client = null;
    }
    if (this.upstashClient) {
      this.upstashClient = null;
    }
    console.log("Redis disconnected");
  }

  public isReady(): boolean {
    return this.isConnected || !!this.upstashClient;
  }

  public isUsingUpstash(): boolean {
    return this.isUpstash;
  }

  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}

// ───────────────────────────────────────────
// 3. EXPORT DU CLIENT SINGLETON
// ───────────────────────────────────────────

const redisInstance = RedisClient.getInstance();

export const redis = {
  connect: () => redisInstance.connect(),
  getClient: () => redisInstance.getClient(),
  disconnect: () => redisInstance.disconnect(),
  isReady: () => redisInstance.isReady(),
  isUsingUpstash: () => redisInstance.isUsingUpstash(),
  getReconnectAttempts: () => redisInstance.getReconnectAttempts(),
};

// ───────────────────────────────────────────
// 4. TYPES
// ───────────────────────────────────────────

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

export interface RateLimitOptions {
  limit: number;
  window: number; // secondes
}

export interface SessionData {
  userId: string;
  role: string;
  email: string;
  name?: string;
  expiresAt: number;
  ip?: string;
  userAgent?: string;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  name: string;
  image?: string;
  maxQuantity?: number;
}

export interface CartData {
  items: CartItem[];
  total: number;
  currency: string;
  updatedAt: number;
  coupon?: string;
  discount?: number;
  subtotal?: number;
}

// ───────────────────────────────────────────
// 5. CACHE MANAGER
// ───────────────────────────────────────────

export class CacheManager {
  private static instance: CacheManager;
  private client: Redis | UpstashRedis | null = null;
  private tagMap = new Map<string, Set<string>>();

  private constructor() {}

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private async getClient() {
    if (!this.client) {
      this.client = await redis.connect();
    }
    return this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const client = await this.getClient();
      const data = await client.get(key);
      if (!data) return null;
      return JSON.parse(data as string) as T;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const client = await this.getClient();
      const serialized = JSON.stringify(value);
      const ttl = options.ttl || 3600;

      if (options.tags?.length) {
        const tagKey = `tag:${key}`;
        await client.setex(tagKey, ttl, JSON.stringify(options.tags));
        
        for (const tag of options.tags) {
          if (!this.tagMap.has(tag)) {
            this.tagMap.set(tag, new Set());
          }
          this.tagMap.get(tag)!.add(key);
        }
      }

      await client.setex(key, ttl, serialized);
    } catch (error) {
      console.error("Cache set error:", error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const client = await this.getClient();
      await client.del(key);
      await client.del(`tag:${key}`);
    } catch (error) {
      console.error("Cache delete error:", error);
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      const keys = this.tagMap.get(tag);
      if (!keys?.size) return;

      const client = await this.getClient();
      const pipeline = client.pipeline();
      
      for (const key of keys) {
        pipeline.del(key);
        pipeline.del(`tag:${key}`);
      }
      
      await pipeline.exec();
      this.tagMap.delete(tag);
    } catch (error) {
      console.error("Cache invalidate by tag error:", error);
    }
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    await Promise.all(tags.map(tag => this.invalidateByTag(tag)));
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fetchFn();
    await this.set(key, value, options);
    return value;
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      return (await client.exists(key)) === 1;
    } catch (error) {
      console.error("Cache exists error:", error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const client = await this.getClient();
      return await client.ttl(key);
    } catch (error) {
      console.error("Cache ttl error:", error);
      return -1;
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      const client = await this.getClient();
      return await client.incrby(key, amount);
    } catch (error) {
      console.error("Cache increment error:", error);
      return 0;
    }
  }
}

// ───────────────────────────────────────────
// 6. SESSION MANAGER
// ───────────────────────────────────────────

export class SessionManager {
  private static instance: SessionManager;
  private client: Redis | UpstashRedis | null = null;
  private readonly SESSION_PREFIX = "session:";
  private readonly SESSION_TTL = 7 * 24 * 3600;

  private constructor() {}

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private async getClient() {
    if (!this.client) {
      this.client = await redis.connect();
    }
    return this.client;
  }

  async createSession(sessionId: string, data: SessionData): Promise<void> {
    try {
      const client = await this.getClient();
      const key = `${this.SESSION_PREFIX}${sessionId}`;
      await client.setex(key, this.SESSION_TTL, JSON.stringify(data));
    } catch (error) {
      console.error("Session create error:", error);
    }
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const client = await this.getClient();
      const key = `${this.SESSION_PREFIX}${sessionId}`;
      const data = await client.get(key);
      if (!data) return null;
      return JSON.parse(data as string) as SessionData;
    } catch (error) {
      console.error("Session get error:", error);
      return null;
    }
  }

  async updateSession(sessionId: string, data: Partial<SessionData>): Promise<void> {
    try {
      const current = await this.getSession(sessionId);
      if (!current) return;

      const client = await this.getClient();
      const key = `${this.SESSION_PREFIX}${sessionId}`;
      const updated = { ...current, ...data };
      await client.setex(key, this.SESSION_TTL, JSON.stringify(updated));
    } catch (error) {
      console.error("Session update error:", error);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      const client = await this.getClient();
      const key = `${this.SESSION_PREFIX}${sessionId}`;
      await client.del(key);
    } catch (error) {
      console.error("Session delete error:", error);
    }
  }

  async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const client = await this.getClient();
      const pattern = `${this.SESSION_PREFIX}*`;
      const keys = await client.keys(pattern);
      
      const sessions: SessionData[] = [];
      for (const key of keys) {
        const data = await client.get(key);
        if (data) {
          const session = JSON.parse(data as string) as SessionData;
          if (session.userId === userId) {
            sessions.push(session);
          }
        }
      }
      
      return sessions;
    } catch (error) {
      console.error("Get user sessions error:", error);
      return [];
    }
  }

  async deleteUserSessions(userId: string): Promise<void> {
    try {
      const client = await this.getClient();
      const pattern = `${this.SESSION_PREFIX}*`;
      const keys = await client.keys(pattern);
      
      for (const key of keys) {
        const data = await client.get(key);
        if (data) {
          const session = JSON.parse(data as string) as SessionData;
          if (session.userId === userId) {
            await client.del(key);
          }
        }
      }
    } catch (error) {
      console.error("Delete user sessions error:", error);
    }
  }
}

// ───────────────────────────────────────────
// 7. RATE LIMITER
// ───────────────────────────────────────────

export class RateLimiter {
  private static instance: RateLimiter;
  private client: Redis | UpstashRedis | null = null;
  private ratelimiters = new Map<string, Ratelimit>();

  private constructor() {}

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  private async getClient() {
    if (!this.client) {
      this.client = await redis.connect();
    }
    return this.client;
  }

  getRateLimiter(identifier: string, options: RateLimitOptions): Ratelimit {
    const key = `${identifier}:${options.limit}:${options.window}`;
    
    if (this.ratelimiters.has(key)) {
      return this.ratelimiters.get(key)!;
    }

    const ratelimit = new Ratelimit({
      redis: this.client!,
      limiter: Ratelimit.slidingWindow(options.limit, `${options.window}s`),
      analytics: true,
    });

    this.ratelimiters.set(key, ratelimit);
    return ratelimit;
  }

  async check(
    identifier: string,
    options: RateLimitOptions
  ): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    try {
      const client = await this.getClient();
      const ratelimit = this.getRateLimiter(identifier, options);
      const result = await ratelimit.limit(identifier);
      
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (error) {
      console.error("Rate limit check error:", error);
      return { success: true, limit: options.limit, remaining: options.limit, reset: 0 };
    }
  }

  async reset(identifier: string): Promise<void> {
    try {
      const client = await this.getClient();
      const key = `@upstash/ratelimit:${identifier}`;
      await client.del(key);
    } catch (error) {
      console.error("Rate limit reset error:", error);
    }
  }
}

// ───────────────────────────────────────────
// 8. CART MANAGER - AVEC HASHES
// ───────────────────────────────────────────

/**
 * Utilisation de Hashes Redis (HSET) au lieu de stocker un gros JSON
 * Permet de modifier la quantité d'un seul produit sans lire/écrire tout le panier
 * Opérations atomiques et plus performantes
 */
export class CartManager {
  private static instance: CartManager;
  private client: Redis | UpstashRedis | null = null;
  private readonly CART_PREFIX = "cart:";
  private readonly CART_META = "cart:meta:";
  private readonly CART_TTL = 30 * 24 * 3600; // 30 jours

  private constructor() {}

  public static getInstance(): CartManager {
    if (!CartManager.instance) {
      CartManager.instance = new CartManager();
    }
    return CartManager.instance;
  }

  private async getClient() {
    if (!this.client) {
      this.client = await redis.connect();
    }
    return this.client;
  }

  /**
   * Récupère le panier complet d'un utilisateur
   */
  async getCart(userId: string): Promise<CartData | null> {
    try {
      const client = await this.getClient();
      const cartKey = `${this.CART_PREFIX}${userId}`;
      
      // Récupérer tous les champs du hash
      const items = await client.hgetall(cartKey);
      if (!items || Object.keys(items).length === 0) return null;

      // Récupérer les métadonnées
      const metaKey = `${this.CART_META}${userId}`;
      const meta = await client.get(metaKey);
      const metaData = meta ? JSON.parse(meta as string) : {};

      const cartItems: CartItem[] = [];
      let total = 0;

      for (const [key, value] of Object.entries(items)) {
        const item = JSON.parse(value as string) as CartItem;
        cartItems.push(item);
        total += item.price * item.quantity;
      }

      return {
        items: cartItems,
        total: total - (metaData.discount || 0),
        currency: metaData.currency || "EUR",
        updatedAt: metaData.updatedAt || Date.now(),
        coupon: metaData.coupon,
        discount: metaData.discount,
        subtotal: total,
      };
    } catch (error) {
      console.error("Cart get error:", error);
      return null;
    }
  }

  /**
   * Récupère un item spécifique du panier
   * Opération O(1) sans lire tout le panier
   */
  async getCartItem(userId: string, productId: string, variantId?: string): Promise<CartItem | null> {
    try {
      const client = await this.getClient();
      const cartKey = `${this.CART_PREFIX}${userId}`;
      const field = variantId ? `${productId}:${variantId}` : productId;
      
      const data = await client.hget(cartKey, field);
      if (!data) return null;
      return JSON.parse(data as string) as CartItem;
    } catch (error) {
      console.error("Get cart item error:", error);
      return null;
    }
  }

  /**
   * Ajoute ou met à jour un item dans le panier
   * Opération atomique avec HSET
   */
  async addItem(userId: string, item: CartItem): Promise<CartData> {
    try {
      const client = await this.getClient();
      const cartKey = `${this.CART_PREFIX}${userId}`;
      const field = item.variantId ? `${item.productId}:${item.variantId}` : item.productId;
      
      // Vérifier si l'item existe déjà
      const existing = await client.hget(cartKey, field);
      
      if (existing) {
        const existingItem = JSON.parse(existing as string) as CartItem;
        const newQuantity = existingItem.quantity + item.quantity;
        const maxQty = existingItem.maxQuantity || item.maxQuantity || Infinity;
        item.quantity = Math.min(newQuantity, maxQty);
      }

      await client.hset(cartKey, field, JSON.stringify(item));
      await client.expire(cartKey, this.CART_TTL);

      // Mettre à jour les métadonnées
      await this.updateCartMeta(userId);

      return (await this.getCart(userId))!;
    } catch (error) {
      console.error("Add cart item error:", error);
      throw error;
    }
  }

  /**
   * Met à jour la quantité d'un item spécifique
   * Opération O(1) sans réécrire tout le panier
   */
  async updateItemQuantity(
    userId: string,
    productId: string,
    variantId: string | undefined,
    quantity: number
  ): Promise<CartData | null> {
    try {
      const client = await this.getClient();
      const cartKey = `${this.CART_PREFIX}${userId}`;
      const field = variantId ? `${productId}:${variantId}` : productId;
      
      const data = await client.hget(cartKey, field);
      if (!data) return null;

      const item = JSON.parse(data as string) as CartItem;
      
      if (quantity <= 0) {
        await client.hdel(cartKey, field);
      } else {
        const maxQty = item.maxQuantity || Infinity;
        item.quantity = Math.min(quantity, maxQty);
        await client.hset(cartKey, field, JSON.stringify(item));
      }

      await this.updateCartMeta(userId);
      return await this.getCart(userId);
    } catch (error) {
      console.error("Update cart item error:", error);
      return null;
    }
  }

  /**
   * Supprime un item spécifique du panier
   */
  async removeItem(userId: string, productId: string, variantId?: string): Promise<CartData | null> {
    try {
      const client = await this.getClient();
      const cartKey = `${this.CART_PREFIX}${userId}`;
      const field = variantId ? `${productId}:${variantId}` : productId;
      
      await client.hdel(cartKey, field);
      await this.updateCartMeta(userId);
      
      return await this.getCart(userId);
    } catch (error) {
      console.error("Remove cart item error:", error);
      return null;
    }
  }

  /**
   * Vide complètement le panier
   */
  async clearCart(userId: string): Promise<void> {
    try {
      const client = await this.getClient();
      const cartKey = `${this.CART_PREFIX}${userId}`;
      const metaKey = `${this.CART_META}${userId}`;
      
      await client.del(cartKey);
      await client.del(metaKey);
    } catch (error) {
      console.error("Clear cart error:", error);
    }
  }

  /**
   * Applique un coupon ou une réduction
   */
  async applyCoupon(userId: string, coupon: string, discount: number): Promise<CartData | null> {
    try {
      const metaKey = `${this.CART_META}${userId}`;
      const client = await this.getClient();
      
      const meta = await client.get(metaKey);
      const metaData = meta ? JSON.parse(meta as string) : {};
      
      metaData.coupon = coupon;
      metaData.discount = discount;
      metaData.updatedAt = Date.now();
      
      await client.setex(metaKey, this.CART_TTL, JSON.stringify(metaData));
      return await this.getCart(userId);
    } catch (error) {
      console.error("Apply coupon error:", error);
      return null;
    }
  }

  /**
   * Met à jour les métadonnées du panier (total, date, etc.)
   */
  private async updateCartMeta(userId: string): Promise<void> {
    try {
      const client = await this.getClient();
      const cartKey = `${this.CART_PREFIX}${userId}`;
      const metaKey = `${this.CART_META}${userId}`;
      
      const items = await client.hgetall(cartKey);
      if (!items || Object.keys(items).length === 0) {
        await client.del(metaKey);
        return;
      }

      let total = 0;
      for (const value of Object.values(items)) {
        const item = JSON.parse(value as string) as CartItem;
        total += item.price * item.quantity;
      }

      const meta = await client.get(metaKey);
      const metaData = meta ? JSON.parse(meta as string) : {};
      
      metaData.total = total;
      metaData.updatedAt = Date.now();
      metaData.itemCount = Object.keys(items).length;
      
      await client.setex(metaKey, this.CART_TTL, JSON.stringify(metaData));
    } catch (error) {
      console.error("Update cart meta error:", error);
    }
  }

  /**
   * Récupère le nombre d'items dans le panier (sans lire tout le contenu)
   */
  async getCartItemCount(userId: string): Promise<number> {
    try {
      const client = await this.getClient();
      const cartKey = `${this.CART_PREFIX}${userId}`;
      return await client.hlen(cartKey);
    } catch (error) {
      console.error("Get cart count error:", error);
      return 0;
    }
  }

  /**
   * Vérifie si le panier contient un produit spécifique
   */
  async hasItem(userId: string, productId: string, variantId?: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      const cartKey = `${this.CART_PREFIX}${userId}`;
      const field = variantId ? `${productId}:${variantId}` : productId;
      return (await client.hexists(cartKey, field)) === 1;
    } catch (error) {
      console.error("Has item error:", error);
      return false;
    }
  }
}

// ───────────────────────────────────────────
// 9. STOCK MANAGER - AVEC VERROUS DISTRIBUÉS
// ───────────────────────────────────────────

/**
 * Sécurité du Stock : La méthode acquireLock est cruciale
 * Sans elle, si 100 personnes cliquent sur "Acheter" en même temps sur le dernier iPhone,
 * la base de données pourrait passer en stock négatif
 */
export class StockManager {
  private static instance: StockManager;
  private client: Redis | UpstashRedis | null = null;
  private readonly STOCK_PREFIX = "stock:";
  private readonly RESERVATION_PREFIX = "reservation:";
  private readonly RESERVATION_TTL = 15 * 60; // 15 minutes
  private readonly LOCK_PREFIX = "lock:stock:";
  private readonly LOCK_TTL = 10; // 10 secondes

  private constructor() {}

  public static getInstance(): StockManager {
    if (!StockManager.instance) {
      StockManager.instance = new StockManager();
    }
    return StockManager.instance;
  }

  private async getClient() {
    if (!this.client) {
      this.client = await redis.connect();
    }
    return this.client;
  }

  /**
   * Verrou distribué pour les opérations de stock
   * Empêche les conditions de course et les stocks négatifs
   */
  private async acquireLock(key: string, ttl: number = this.LOCK_TTL): Promise<boolean> {
    try {
      const client = await this.getClient();
      const lockKey = `${this.LOCK_PREFIX}${key}`;
      const result = await client.set(lockKey, "locked", "EX", ttl, "NX");
      return result === "OK";
    } catch (error) {
      console.error("Acquire lock error:", error);
      return false;
    }
  }

  private async releaseLock(key: string): Promise<void> {
    try {
      const client = await this.getClient();
      const lockKey = `${this.LOCK_PREFIX}${key}`;
      await client.del(lockKey);
    } catch (error) {
      console.error("Release lock error:", error);
    }
  }

  /**
   * Récupère le stock d'un produit
   */
  async getStock(productId: string, variantId?: string): Promise<number> {
    try {
      const client = await this.getClient();
      const key = variantId 
        ? `${this.STOCK_PREFIX}${productId}:${variantId}`
        : `${this.STOCK_PREFIX}${productId}`;
      const stock = await client.get(key);
      return stock ? parseInt(stock as string, 10) : 0;
    } catch (error) {
      console.error("Stock get error:", error);
      return 0;
    }
  }

  /**
   * Définit le stock d'un produit
   */
  async setStock(productId: string, quantity: number, variantId?: string): Promise<void> {
    try {
      const client = await this.getClient();
      const key = variantId 
        ? `${this.STOCK_PREFIX}${productId}:${variantId}`
        : `${this.STOCK_PREFIX}${productId}`;
      await client.set(key, quantity.toString());
    } catch (error) {
      console.error("Stock set error:", error);
    }
  }

  /**
   * Réserve du stock avec verrou distribué
   * Opération atomique qui empêche les stocks négatifs
   */
  async reserveStock(
    productId: string,
    quantity: number,
    orderId: string,
    variantId?: string
  ): Promise<boolean> {
    const lockKey = variantId ? `${productId}:${variantId}` : productId;
    
    // Acquérir un verrou pour ce produit spécifique
    const locked = await this.acquireLock(lockKey);
    if (!locked) {
      console.warn(`Could not acquire lock for product ${productId}`);
      return false;
    }

    try {
      const client = await this.getClient();
      const stockKey = variantId 
        ? `${this.STOCK_PREFIX}${productId}:${variantId}`
        : `${this.STOCK_PREFIX}${productId}`;
      const reservationKey = `${this.RESERVATION_PREFIX}${orderId}:${productId}`;

      // Vérifier le stock disponible (lecture atomique)
      const currentStock = await this.getStock(productId, variantId);
      if (currentStock < quantity) {
        return false;
      }

      // Décrémenter le stock (opération atomique)
      const newStock = await client.decrby(stockKey, quantity);
      if (newStock < 0) {
        // Si le stock devient négatif, annuler et restaurer
        await client.incrby(stockKey, quantity);
        return false;
      }

      // Enregistrer la réservation
      await client.setex(
        reservationKey,
        this.RESERVATION_TTL,
        JSON.stringify({ productId, variantId, quantity, orderId, reservedAt: Date.now() })
      );

      return true;
    } catch (error) {
      console.error("Stock reserve error:", error);
      return false;
    } finally {
      // Toujours libérer le verrou
      await this.releaseLock(lockKey);
    }
  }

  /**
   * Libère le stock réservé avec verrou
   */
  async releaseStock(productId: string, orderId: string, variantId?: string): Promise<void> {
    const lockKey = variantId ? `${productId}:${variantId}` : productId;
    
    const locked = await this.acquireLock(lockKey);
    if (!locked) {
      console.warn(`Could not acquire lock for release ${productId}`);
      return;
    }

    try {
      const client = await this.getClient();
      const reservationKey = `${this.RESERVATION_PREFIX}${orderId}:${productId}`;
      const reservation = await client.get(reservationKey);
      
      if (reservation) {
        const data = JSON.parse(reservation as string);
        const stockKey = variantId 
          ? `${this.STOCK_PREFIX}${productId}:${variantId}`
          : `${this.STOCK_PREFIX}${productId}`;
        await client.incrby(stockKey, data.quantity);
        await client.del(reservationKey);
      }
    } catch (error) {
      console.error("Stock release error:", error);
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  /**
   * Vérifie si un produit est en stock
   */
  async isInStock(productId: string, quantity: number = 1, variantId?: string): Promise<boolean> {
    const stock = await this.getStock(productId, variantId);
    return stock >= quantity;
  }

  /**
   * Récupère les réservations actives d'une commande
   */
  async getReservations(orderId: string): Promise<any[]> {
    try {
      const client = await this.getClient();
      const pattern = `${this.RESERVATION_PREFIX}${orderId}:*`;
      const keys = await client.keys(pattern);
      
      const reservations = [];
      for (const key of keys) {
        const data = await client.get(key);
        if (data) {
          reservations.push(JSON.parse(data as string));
        }
      }
      
      return reservations;
    } catch (error) {
      console.error("Get reservations error:", error);
      return [];
    }
  }

  /**
   * Libère toutes les réservations expirées
   * À exécuter périodiquement via un cron job
   */
  async cleanupExpiredReservations(): Promise<void> {
    try {
      const client = await this.getClient();
      const pattern = `${this.RESERVATION_PREFIX}*`;
      const keys = await client.keys(pattern);
      
      for (const key of keys) {
        const data = await client.get(key);
        if (data) {
          const reservation = JSON.parse(data as string);
          // Vérifier si la réservation est expirée (TTL géré par Redis automatiquement)
          // Mais on peut aussi libérer manuellement si besoin
          const ttl = await client.ttl(key);
          if (ttl <= 0) {
            // La réservation a expiré, libérer le stock
            await this.releaseStock(
              reservation.productId,
              reservation.orderId,
              reservation.variantId
            );
          }
        }
      }
    } catch (error) {
      console.error("Cleanup expired reservations error:", error);
    }
  }
}

// ───────────────────────────────────────────
// 10. ANALYTICS MANAGER
// ───────────────────────────────────────────

export class AnalyticsManager {
  private static instance: AnalyticsManager;
  private client: Redis | UpstashRedis | null = null;

  private constructor() {}

  public static getInstance(): AnalyticsManager {
    if (!AnalyticsManager.instance) {
      AnalyticsManager.instance = new AnalyticsManager();
    }
    return AnalyticsManager.instance;
  }

  private async getClient() {
    if (!this.client) {
      this.client = await redis.connect();
    }
    return this.client;
  }

  async incrementCounter(event: string, amount: number = 1): Promise<void> {
    try {
      const client = await this.getClient();
      const key = `analytics:counter:${event}`;
      await client.incrby(key, amount);
    } catch (error) {
      console.error("Analytics increment error:", error);
    }
  }

  async trackPageView(page: string, userId?: string): Promise<void> {
    try {
      const client = await this.getClient();
      const today = new Date().toISOString().split("T")[0];
      const key = `analytics:pageviews:${today}:${page}`;
      await client.incr(key);
      
      if (userId) {
        const userKey = `analytics:user:${userId}:pageviews:${today}`;
        await client.incr(userKey);
      }
    } catch (error) {
      console.error("Track page view error:", error);
    }
  }

  async getStats(days: number = 7): Promise<Record<string, number>> {
    try {
      const client = await this.getClient();
      const stats: Record<string, number> = {};
      const today = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const key = `analytics:pageviews:${date.toISOString().split("T")[0]}:*`;
        const keys = await client.keys(key);
        
        let total = 0;
        for (const k of keys) {
          const count = await client.get(k);
          total += parseInt(count as string || "0", 10);
        }
        
        stats[date.toISOString().split("T")[0]] = total;
      }
      
      return stats;
    } catch (error) {
      console.error("Get stats error:", error);
      return {};
    }
  }
}

// ───────────────────────────────────────────
// 11. DISTRIBUTED LOCK - AMÉLIORÉ
// ───────────────────────────────────────────

export class DistributedLock {
  private static instance: DistributedLock;
  private client: Redis | UpstashRedis | null = null;
  private readonly LOCK_PREFIX = "lock:";
  private readonly DEFAULT_TTL = 30;

  private constructor() {}

  public static getInstance(): DistributedLock {
    if (!DistributedLock.instance) {
      DistributedLock.instance = new DistributedLock();
    }
    return DistributedLock.instance;
  }

  private async getClient() {
    if (!this.client) {
      this.client = await redis.connect();
    }
    return this.client;
  }

  /**
   * Acquiert un verrou avec retry et backoff
   */
  async acquireLock(
    key: string,
    ttl: number = this.DEFAULT_TTL,
    retryCount: number = 5,
    retryDelay: number = 100
  ): Promise<boolean> {
    try {
      const client = await this.getClient();
      const lockKey = `${this.LOCK_PREFIX}${key}`;
      
      for (let attempt = 0; attempt < retryCount; attempt++) {
        const result = await client.set(lockKey, Date.now().toString(), "EX", ttl, "NX");
        if (result === "OK") {
          return true;
        }
        
        // Backoff exponentiel avec jitter
        const delay = Math.min(retryDelay * Math.pow(1.5, attempt) + Math.random() * 50, 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      return false;
    } catch (error) {
      console.error("Acquire lock error:", error);
      return false;
    }
  }

  /**
   * Libère un verrou
   */
  async releaseLock(key: string): Promise<void> {
    try {
      const client = await this.getClient();
      const lockKey = `${this.LOCK_PREFIX}${key}`;
      await client.del(lockKey);
    } catch (error) {
      console.error("Release lock error:", error);
    }
  }

  /**
   * Exécute une fonction avec verrou
   * Garantit l'exclusion mutuelle
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const locked = await this.acquireLock(key, ttl);
    if (!locked) {
      throw new Error(`Could not acquire lock for key: ${key}`);
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(key);
    }
  }

  /**
   * Vérifie si un verrou existe
   */
  async isLocked(key: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      const lockKey = `${this.LOCK_PREFIX}${key}`;
      return (await client.exists(lockKey)) === 1;
    } catch (error) {
      console.error("Check lock error:", error);
      return false;
    }
  }

  /**
   * Récupère le TTL restant d'un verrou
   */
  async getLockTTL(key: string): Promise<number> {
    try {
      const client = await this.getClient();
      const lockKey = `${this.LOCK_PREFIX}${key}`;
      return await client.ttl(lockKey);
    } catch (error) {
      console.error("Get lock TTL error:", error);
      return -1;
    }
  }
}

// ───────────────────────────────────────────
// 12. QUEUE MANAGER
// ───────────────────────────────────────────

export class QueueManager {
  private static instance: QueueManager;
  private client: Redis | UpstashRedis | null = null;
  private queues = new Map<string, Set<string>>();

  private constructor() {}

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  private async getClient() {
    if (!this.client) {
      this.client = await redis.connect();
    }
    return this.client;
  }

  async enqueue(queueName: string, job: any, priority: number = 0): Promise<void> {
    try {
      const client = await this.getClient();
      const key = `queue:${queueName}`;
      const jobData = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        data: job,
        priority,
        createdAt: Date.now(),
        attempts: 0,
        maxAttempts: 3,
      };
      
      // Utiliser sorted set pour la priorité
      await client.zadd(key, priority, JSON.stringify(jobData));
      
      if (!this.queues.has(queueName)) {
        this.queues.set(queueName, new Set());
      }
      this.queues.get(queueName)!.add(key);
    } catch (error) {
      console.error("Queue enqueue error:", error);
    }
  }

  async dequeue(queueName: string): Promise<any | null> {
    try {
      const client = await this.getClient();
      const key = `queue:${queueName}`;
      const job = await client.zpopmin(key);
      if (!job || job.length === 0) return null;
      return JSON.parse(job[0] as string);
    } catch (error) {
      console.error("Queue dequeue error:", error);
      return null;
    }
  }

  async getQueueSize(queueName: string): Promise<number> {
    try {
      const client = await this.getClient();
      const key = `queue:${queueName}`;
      return await client.zcard(key);
    } catch (error) {
      console.error("Queue size error:", error);
      return 0;
    }
  }

  async clearQueue(queueName: string): Promise<void> {
    try {
      const client = await this.getClient();
      const key = `queue:${queueName}`;
      await client.del(key);
    } catch (error) {
      console.error("Queue clear error:", error);
    }
  }

  async processQueue<T>(
    queueName: string,
    processor: (job: any) => Promise<T>,
    batchSize: number = 10
  ): Promise<T[]> {
    const results: T[] = [];
    let processed = 0;
    
    while (processed < batchSize) {
      const job = await this.dequeue(queueName);
      if (!job) break;

      try {
        const result = await processor(job);
        results.push(result);
      } catch (error) {
        console.error(`Job processing error for queue ${queueName}:`, error);
        job.attempts++;
        if (job.attempts < job.maxAttempts) {
          await this.enqueue(queueName, job.data, job.priority + 1);
        }
      }
      processed++;
    }
    
    return results;
  }
}

// ───────────────────────────────────────────
// 13. EXPORT DES INSTANCES SINGLETON
// ───────────────────────────────────────────

export const cache = CacheManager.getInstance();
export const session = SessionManager.getInstance();
export const rateLimiter = RateLimiter.getInstance();
export const cart = CartManager.getInstance();
export const stock = StockManager.getInstance();
export const analytics = AnalyticsManager.getInstance();
export const lock = DistributedLock.getInstance();
export const queue = QueueManager.getInstance();

// ───────────────────────────────────────────
// 14. INITIALISATION
// ───────────────────────────────────────────

if (REDIS_ENABLED) {
  redis.connect().catch((error) => {
    console.error("Failed to initialize Redis:", error);
  });
}

// ───────────────────────────────────────────
// 15. EXPORT PAR DÉFAUT
// ───────────────────────────────────────────

export default RedisModule {
  redis
  cache
  session
  rateLimiter
  cart
  stock
  analytics
  lock
  queue
};

// ───────────────────────────────────────────
// 16. TYPES EXPORTÉS
// ───────────────────────────────────────────

export type { Redis, UpstashRedis };