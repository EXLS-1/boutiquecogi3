// prisma/seed/transaction.ts
// ============================================
// UTILITAIRES TRANSACTIONNELS & BATCHING
// ============================================
// Évite les erreurs de timeout PostgreSQL (Transaction API error:
// Transaction already closed) lors des insertions massives en dev ou
// dans les scénarios. Exécute chaque lot dans une sous-transaction
// isolée plutôt qu'une transaction globale monolithique.

import type { PrismaClient, Prisma } from "@prisma/client";
import type { SeedContext } from "./types";

const DEFAULT_BATCH_SIZE = 500;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 250;

export interface BatchOptions {
  batchSize?: number;
  /** Prisma transaction options (timeout, isolationLevel). */
  transactionOptions?: { timeout?: number; maxWait?: number };
}

/**
 * Découpe un tableau en lots et exécute la tâche pour chaque lot,
 * chaque lot étant encapsulé dans sa propre transaction Prisma.
 * Idempotent : la tâche doit utiliser upsert / createMany(skipDuplicates).
 */
export async function executeInBatches<T>(
  ctx: SeedContext,
  items: T[],
  batchSize: number | BatchOptions,
  task: (batch: T[], tx: Prisma.TransactionClient) => Promise<void>,
): Promise<void> {
  const opts: BatchOptions =
    typeof batchSize === "number" ? { batchSize } : batchSize;
  const size = opts.batchSize ?? DEFAULT_BATCH_SIZE;

  const totalBatches = Math.ceil(items.length / size);
  ctx.logger.debug(
    `Batching ${items.length} éléments en ${totalBatches} lot(s) de ${size}.`,
  );

  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const batchIndex = Math.floor(i / size) + 1;

    await withRetry(
      ctx,
      () =>
        ctx.prisma.$transaction((tx) => task(batch, tx), opts.transactionOptions),
      `batch ${batchIndex}/${totalBatches}`,
    );

    ctx.logger.debug(
      `Batch ${batchIndex}/${totalBatches} exécuté (${batch.length} éléments).`,
    );
  }
}

/**
 * Ré-exécute une opération en cas de deadlock / erreur transitoire DB.
 */
export async function withRetry<T>(
  ctx: SeedContext,
  fn: () => Promise<T>,
  label = "opération",
  maxRetries = DEFAULT_MAX_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) throw err;

      const msg = err instanceof Error ? err.message : String(err);
      const retryable =
        /deadlock|already closed|timeout|connection|ECONNRESET|busy/i.test(msg);

      if (!retryable) throw err;

      ctx.logger.warn(
        `Retry ${attempt}/${maxRetries} pour ${label} (${msg})`,
      );
      await new Promise((r) => setTimeout(r, retryDelayMs * attempt));
    }
  }
}

/**
 * Exécute une liste de tâches transactionnelles séquentiellement,
 * chacune dans sa propre transaction (évite le timeout global).
 */
export async function runSequentialTransactions<T>(
  ctx: SeedContext,
  tasks: Array<(tx: Prisma.TransactionClient) => Promise<T>>,
  options?: { timeout?: number },
): Promise<T[]> {
  const results: T[] = [];
  for (const task of tasks) {
    results.push(
      await ctx.prisma.$transaction(task, { timeout: options?.timeout }),
    );
  }
  return results;
}
