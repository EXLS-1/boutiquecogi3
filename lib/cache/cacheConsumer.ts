// lib/cache/cacheConsumer.ts
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

const CONSUMER_GROUP = "cache-sync-group";
const CONSUMER_NAME = `consumer-${process.pid}`;
const STREAM_KEY = "stream:domain-events";
const BATCH_SIZE = 50;

export class CacheConsumer {
  private isRunning = false;

  async start(): Promise<void> {
    this.isRunning = true;
    
    // Créer le consumer group s'il n'existe pas
    try {
      await redis.xgroup("CREATE", STREAM_KEY, CONSUMER_GROUP, "$", "MKSTREAM");
    } catch (err: any) {
      if (!err.message?.includes("already exists")) throw err;
    }

    while (this.isRunning) {
      try {
        await this.processBatch();
      } catch (error) {
        console.error("[CacheConsumer] Batch error:", error);
        await new Promise(r => setTimeout(r, 1000)); // Backoff avant retry
      }
    }
  }

  stop(): void {
    this.isRunning = false;
  }

  private async processBatch(): Promise<void> {
    // Lire les messages du stream avec consumer group
    const messages = await redis.xreadgroup(
      "GROUP", CONSUMER_GROUP, CONSUMER_NAME,
      "COUNT", BATCH_SIZE,
      "BLOCK", 5000, // Block 5s si pas de messages
      "STREAMS", STREAM_KEY, ">"
    ) as [string, [string, string[]][]][] | null;

    if (!messages || messages.length === 0) return;

    const [[, streamMessages]] = messages;
    if (!streamMessages || streamMessages.length === 0) return;

    const processedIds: string[] = [];
    const failedEntries: { id: string; error: string }[] = [];

    for (const [messageId, fields] of streamMessages) {
      try {
        const event = this.parseEvent(fields);
        await this.handleEvent(event);
        processedIds.push(messageId);
      } catch (error) {
        failedEntries.push({
          id: messageId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // ACK les messages traités
    if (processedIds.length > 0) {
      await redis.xack(STREAM_KEY, CONSUMER_GROUP, ...processedIds);
    }

    // Gérer les échecs (XPENDING pour retry, puis DLQ)
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

    // Idempotence : vérifier si déjà traité
    const processedKey = `event:processed:${event.eventId}`;
    const alreadyProcessed = await redis.get(processedKey);
    if (alreadyProcessed) return;
    
    // Marquer comme traité immédiatement (TTL 24h)
    await redis.setex(processedKey, 86400, "1");

    const startTime = Date.now();

    switch (eventType) {
      case "CatalogBulkUpdated":
        // Stratégie nucléaire : bump de version = tout le catalogue devient obsolète
        await this.bumpCatalogVersion(catalogId);
        break;

      case "ProductPriceUpdated":
        // Invalidation ciblée
        if (payload.batchSize && payload.batchSize > 100) {
          // Batch trop gros → version bump plus efficace
          await this.bumpCatalogVersion(catalogId);
        } else {
          await this.invalidateProductPrices(catalogId, payload.productIds as string[]);
        }
        break;

      case "ProductStockChanged":
        await this.invalidateProductStock(catalogId, event.aggregateId);
        break;

      case "CategoryTreeChanged":
      case "CategoryMoved":
        // L'arbre est versionné → bump suffit
        await this.bumpCatalogVersion(catalogId);
        // Optionnel : rebuild async de l'arbre
        this.rebuildCategoryTree(catalogId).catch(console.error);
        break;

      case "ProductCreated":
      case "ProductUpdated":
        await this.invalidateProductDetail(catalogId, event.aggregateId);
        break;

      default:
        console.warn(`[CacheConsumer] Unknown event type: ${eventType}`);
    }

    // Métriques
    const syncLagMs = Date.now() - startTime;
    await this.recordMetrics({
      catalogId,
      eventType,
      syncLagMs,
      eventId: event.eventId,
    });
  }

  // ==================== STRATÉGIES D'INVALIDATION ====================

  /**
   * Bump de version : invalide TOUT le catalogue en une seule opération O(1).
   * C'est la stratégie recommandée pour les mutations de masse.
   */
  private async bumpCatalogVersion(catalogId: string): Promise<void> {
    const versionKey = `catalog:${catalogId}:version`;
    const newVersion = await redis.incr(versionKey);
    
    // Optionnel : supprimer explicitement les anciennes clés avec un délai
    // (elles expirent par TTL de toute façon, mais on peut accélérer)
    const oldVersion = newVersion - 1;
    const patternsToDelete = [
      `catalog:${catalogId}:categories:tree:v${oldVersion}`,
      `catalog:${catalogId}:prices:v${oldVersion}`,
      `catalog:${catalogId}:products:*:v${oldVersion}`,
    ];
    
    // Suppression async non bloquante
    for (const pattern of patternsToDelete) {
      redis.unlink(pattern).catch(() => {}); // unlink = non bloquant
    }

    console.log(`[CacheConsumer] Catalog ${catalogId} version bumped to ${newVersion}`);
  }

  private async invalidateProductPrices(
    catalogId: string,
    productIds: string[]
  ): Promise<void> {
    const version = await redis.get(`catalog:${catalogId}:version`) || "0";
    const priceKey = `catalog:${catalogId}:prices:v${version}`;
    
    // HDEL pour supprimer les entrées du hash
    if (productIds.length > 0) {
      await redis.hdel(priceKey, ...productIds);
    }

    // Supprimer les clés détail individuelles
    const pipeline = redis.pipeline();
    for (const productId of productIds) {
      pipeline.del(`product:${productId}:catalog:${catalogId}:price:v${version}`);
    }
    await pipeline.exec();
  }

  private async invalidateProductStock(catalogId: string, productId: string): Promise<void> {
    // Stock est souvent dans le hash prix ou une clé séparée
    const version = await redis.get(`catalog:${catalogId}:version`) || "0";
    await redis.hdel(`catalog:${catalogId}:stock:v${version}`, productId);
  }

  private async invalidateProductDetail(catalogId: string, productId: string): Promise<void> {
    const version = await redis.get(`catalog:${catalogId}:version`) || "0";
    await redis.del(`product:${productId}:catalog:${catalogId}:detail:v${version}`);
  }

  private async rebuildCategoryTree(catalogId: string): Promise<void> {
    // Reconstruction lazy au prochain read, ou eager ici
    const tree = await prisma.category.findMany({
      where: { catalogId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    // ... build tree logic ...
    // Cette partie est appelée async, elle ne bloque pas le consumer
  }

  // ==================== GESTION DES ERREURS ====================

  private async handleFailedMessage(messageId: string, error: string): Promise<void> {
    // Vérifier le nombre de deliveries (XPENDING)
    const pending = await redis.xpending(
      STREAM_KEY, CONSUMER_GROUP, 
      messageId, messageId, 1
    );
    
    const deliveryCount = pending?.[0]?.[3] || 0;

    if (deliveryCount >= 3) {
      // Déplacer vers DLQ stream
      await redis.xadd("stream:dlq-cache-sync", "*",
        "originalId", messageId,
        "error", error,
        "failedAt", new Date().toISOString(),
        "deliveryCount", String(deliveryCount)
      );
      // ACK pour ne plus retry
      await redis.xack(STREAM_KEY, CONSUMER_GROUP, messageId);
    }
    // Sinon, Redis le redelivera automatiquement (claim timeout)
  }

  private async recordMetrics(data: {
    catalogId: string;
    eventType: string;
    syncLagMs: number;
    eventId: string;
  }): Promise<void> {
    // Métriques Redis pour monitoring temps réel
    const key = `metrics:cache:sync:${data.catalogId}`;
    await redis.hset(key, {
      lastEventType: data.eventType,
      lastSyncLagMs: data.syncLagMs,
      lastProcessedAt: new Date().toISOString(),
    });
    await redis.expire(key, 86400);
  }
}

// Dans le CacheConsumer (lib/cache/cacheConsumer.ts)
// Ajouter ces cas dans handleEvent() :

private async handleEvent(event: Record<string, string>): Promise<void> {
  // ... (idempotence check identique) ...

  const eventType = event.eventType;
  const catalogId = event.catalogId;
  const payload = JSON.parse(event.payload || "{}");

  switch (eventType) {
    case "ProductCreated":
      // Invalider l'arbre catégories (nouveau produit = nouveau compteur)
      await this.bumpCatalogVersion(catalogId);
      // Pré-warm le nouveau produit si besoin
      if (payload.variantCount > 0) {
        await this.invalidateProductPrices(catalogId, []); // Force rebuild
      }
      break;

    case "ProductStockChanged":
      // Invalidation ciblée du variant
      await this.invalidateVariantStock(payload.variantId, catalogId);
      // Invalidation du hash prix si le stock impacte la disponibilité
      await this.invalidateProductPrices(catalogId, [payload.variantId]);
      break;

    // ... autres cas existants ...
  }
}

private async invalidateVariantStock(variantId: string, catalogId: string): Promise<void> {
  const version = await redis.get(`catalog:${catalogId}:version`) || "0";
  // Supprimer la clé stock spécifique au variant
  await redis.del(`variant:${variantId}:stock:v${version}`);
  // Mettre à jour le hash global des stocks
  await redis.hdel(`catalog:${catalogId}:stocks:v${version}`, variantId);
}
