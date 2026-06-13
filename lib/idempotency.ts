// lib/idempotency.ts
// This file provides a utility function to execute business logic in an idempotent manner using Prisma transactions.
// The `executeIdempotent` function checks if a given key has already been processed, and if not, it executes the provided logic and marks the key as processed. This ensures that the same operation is not executed multiple times, which is crucial for operations like payment processing or webhook handling.
// The `buildWebhookIdempotencyKey` function is a helper to create a standardized key for webhook events based on the provider and transaction ID.

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/uuid";

/**
 * Exécute une logique métier de manière idempotente au sein d'une transaction.
 */
export async function executeIdempotent<T>(
  config: {
    key: string;
    scope: string;
    method: string;
    route: string;
    requestBody: any;
  },
  logic: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<{ ok: boolean; fromCache: boolean; data?: T; error?: string }> {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Vérifier si la clé existe déjà
      const existing = await tx.idempotencyKey.findUnique({
        where: { key: config.key },
      });

      if (existing) {
        return { ok: true, fromCache: true };
      }

      // 2. Exécuter la logique métier
      const result = await logic(tx);

      // 3. Marquer comme traité
      await tx.idempotencyKey.create({
        data: {
          id: generateUUIDv7(),
          key: config.key,
          // 'scope' field removed: ensure the IdempotencyKey model does not define a 'scope' property
          route: config.route,
          responseStatus: 200,
        },
      });

      return { ok: true, fromCache: false, data: result };
    });
  } catch (error: any) {
    return { ok: false, fromCache: false, error: error.message };
  }
}

export function buildWebhookIdempotencyKey(provider: string, transId: string) {
  return `webhook:${provider}:${transId}`;
}
