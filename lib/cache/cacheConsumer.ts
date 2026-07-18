// lib/cache/cacheConsumer.ts

import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import type Redis from "ioredis";

const CONSUMER_GROUP = "cache-sync-group";
const CONSUMER_NAME = `consumer-${process.pid}`;
const STREAM_KEY = "stream:domain-events";
const BATCH_SIZE = 50;

type StreamRedis = Redis & {
  xgroup: (...args: any[]) => any;
  xreadgroup: (...args: any[]) => any;
  xack: (...args: any[]) => any;
  xpending: (...args: any[]) => any;
  xadd: (...args: any[]) => any;
};

export class CacheConsumer {
  private isRunning = false;

  private client: Redis | null = null;

  private async getClient(): Promise<StreamRedis> {
    if (!this.client) {
      const client = await redis.getClient();

      const maybeClient = client as unknown as Partial<StreamRedis>;
      if (
        typeof maybeClient.xgroup !== "function" ||
        typeof maybeClient.xreadgroup !== "function" ||
        typeof maybeClient.xack !== "function" ||
        typeof maybeClient.xpending !== "function" ||
        typeof maybeClient.xadd !== "function"
      ) {
        throw new Error(
          "Redis client does not support stream consumer-group commands (xgroup/xreadgroup/xack/xpending/xadd).",
        );
      }

      this.client = client as Redis;
    }

    return this.client as unknown as StreamRedis;
  }

  async start(): Promise<void> {
    this.isRunning = true;

    try {
      await redis.xgroup(
        "CREATE",
        STREAM_KEY,
        CONSUMER_GROUP,
        "$",
        "MKSTREAM",
      );
    } catch (err: any) {
      if (!err?.message?.includes("already exists")) throw err;
    }

    while (this.isRunning) {
      try {
        await this.processBatch();
      } catch (error) {
        console.error("[CacheConsumer] Batch error:", error);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  stop(): void {
    this.isRunning = false;
  }

  private async processBatch(): Promise<void> {
    const messages = (await redis.xreadgroup(
      "GROUP",
      CONSUMER_GROUP,
      CONSUMER_NAME,
      "COUNT",
      BATCH_SIZE,
      "BLOCK",
      5000,
      "STREAMS",
      STREAM_KEY,
      ">",
    )) as [string, [string, string[]][]][] | null;

    if (!messages || messages.length === 0) return;

    const [, streamMessages] = messages[0];
    if (!streamMessages || streamMessages.length === 0) return;

    const processedIds: string[] = [];
    const failedEntries: { id: string; error: string }[] = [];

    for (const [messageId, fields] of streamMessages) {
      try {
        const event = this.parseEvent(fields);
        await this.handleEvent(event);
        processedIds.push(messageId);
      } catch (error: any) {
        failedEntries.push({
          id: messageId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (processedIds.length > 0) {
      await redis.xack(STREAM_KEY, CONSUMER_GROUP, ...processedIds);
    }

    for (const { id, error } of failedEntries) {
      await this.handleFailedMessage(id, error);
    }
  }

  private parseEvent(fields: string[]): Record<string, string> {
    const event: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      event[fields[i]] = fields[i + 1];
    }
    return event;
  }

  private async handleEvent(event: Record<string, string>): Promise<void> {
    const eventType = event.eventType;
    const catalogId = event.catalogId;
    const payload = JSON.parse(event.payload || "{}");

    const processedKey = `event:processed:${event.eventId}`;
    const alreadyProcessed = await redis.get(processedKey);
    if (alreadyProcessed) return;

    await redis.setEx(processedKey, 86400, "1");

    const startTime = Date.now();

    switch (eventType) {
      case "CatalogBulkUpdated":
        await this.bumpCatalogVersion(catalogId);
        break;

      case "ProductPriceUpdated":
        if (payload.batchSize && payload.batchSize > 100) {
          await this.bumpCatalogVersion(catalogId);
        } else {
          await this.invalidateProductPrices(
            catalogId,
            (payload.productIds ?? []) as string[],
          );
        }
        break;

      case "ProductStockChanged":
        await this.invalidateProductStock(catalogId, event.aggregateId);
        break;

      case "CategoryTreeChanged":
      case "CategoryMoved":
        await this.bumpCatalogVersion(catalogId);
        this.rebuildCategoryTree(catalogId).catch(console.error);
        break;

      case "ProductCreated":
      case "ProductUpdated":
        await this.invalidateProductDetail(catalogId, event.aggregateId);
        break;

      default:
        console.warn(`[CacheConsumer] Unknown event type: ${eventType}`);
    }

    const syncLagMs = Date.now() - startTime;
    await this.recordMetrics({
      catalogId,
      eventType,
      syncLagMs,
      eventId: event.eventId,
    });
  }

  private async bumpCatalogVersion(catalogId: string): Promise<void> {
    const versionKey = `catalog:${catalogId}:version`;
    const newVersion = await redis.incr(versionKey);

    const oldVersion = newVersion - 1;
    const patternsToDelete = [
      `catalog:${catalogId}:categories:tree:v${oldVersion}`,
      `catalog:${catalogId}:prices:v${oldVersion}`,
      `catalog:${catalogId}:products:*:v${oldVersion}`,
    ];

    for (const pattern of patternsToDelete) {
      redis.unlink(pattern).catch(() => {});
    }

    console.log(`[CacheConsumer] Catalog ${catalogId} version bumped to ${newVersion}`);
  }

  private async invalidateProductPrices(
    catalogId: string,
    productIds: string[],
  ): Promise<void> {
    const version = (await redis.get(`catalog:${catalogId}:version`)) || "0";
    const priceKey = `catalog:${catalogId}:prices:v${version}`;

    if (productIds.length > 0) {
      await redis.hdel(priceKey, ...productIds);
    }

    const pipeline = redis.pipeline();
    for (const productId of productIds) {
      pipeline.del(`product:${productId}:catalog:${catalogId}:price:v${version}`);
    }
    await pipeline.exec();
  }

  private async invalidateProductStock(
    catalogId: string,
    productId: string,
  ): Promise<void> {
    const version = (await redis.get(`catalog:${catalogId}:version`)) || "0";
    await redis.hdel(`catalog:${catalogId}:stock:v${version}`, productId);
  }

  private async invalidateProductDetail(
    catalogId: string,
    productId: string,
  ): Promise<void> {
    const version = (await redis.get(`catalog:${catalogId}:version`)) || "0";
    await redis.del(
      `product:${productId}:catalog:${catalogId}:detail:v${version}`,
    );
  }

  private async rebuildCategoryTree(catalogId: string): Promise<void> {
    await prisma.category.findMany({
      where: { catalogId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  private async handleFailedMessage(
    messageId: string,
    error: string,
  ): Promise<void> {
    const pending = await redis.xpending(
      STREAM_KEY,
      CONSUMER_GROUP,
      messageId,
      messageId,
      1,
    );

    const deliveryCount = pending?.[0]?.[3] || 0;

    if (deliveryCount >= 3) {
      await redis.xadd(
        "stream:dlq-cache-sync",
        "*",
        "originalId",
        messageId,
        "error",
        error,
        "failedAt",
        new Date().toISOString(),
        "deliveryCount",
        String(deliveryCount),
      );

      await redis.xack(STREAM_KEY, CONSUMER_GROUP, messageId);
    }
  }

  private async recordMetrics(data: {
    catalogId: string;
    eventType: string;
    syncLagMs: number;
    eventId: string;
  }): Promise<void> {
    const key = `metrics:cache:sync:${data.catalogId}`;
    await redis.hset(key, {
      lastEventType: data.eventType,
      lastSyncLagMs: data.syncLagMs,
      lastProcessedAt: new Date().toISOString(),
    });
    await redis.expire(key, 86400);
  }
}

