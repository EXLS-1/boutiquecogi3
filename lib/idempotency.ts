// File: lib/idempotency.ts

import { createHash } from "crypto";
import { uuidv7 } from "uuidv7";

import { Prisma, PrismaClient } from "@/generated/prisma";

/* ========================================================================== */
/* PRISMA SINGLETON */
/* ========================================================================== */

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/* ========================================================================== */
/* TYPES */
/* ========================================================================== */

export type IdempotencyScope =
  | "PAYMENT"
  | "CHECKOUT"
  | "WEBHOOK"
  | "RETRY";

export type IdempotencyStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface IdempotencyContext {
  scope: IdempotencyScope;

  /**
   * Client-provided or internally-generated key.
   * Must remain stable across retries.
   */
  key: string;

  userId?: string | null;

  method?: string;
  route?: string;

  requestBody?: unknown;

  /**
   * Optional externally-computed hash.
   */
  requestHash?: string;

  metadata?: Prisma.InputJsonValue;

  /**
   * Default: 24h
   */
  ttlSeconds?: number;

  /**
   * Default: 3
   */
  maxRetries?: number;
}

export interface IdempotencySuccessResult<T> {
  ok: true;

  /**
   * Indicates whether response came
   * from cached idempotent result.
   */
  fromCache: boolean;

  data: T;

  recordId: string;
}

export interface IdempotencyErrorResult {
  ok: false;

  fromCache: boolean;

  error: string;

  recordId?: string;
}

export type IdempotencyExecutionResult<T> =
  | IdempotencySuccessResult<T>
  | IdempotencyErrorResult;

interface StoredResponse<T> {
  data: T;
  createdAt: string;
}

/* ========================================================================== */
/* CONFIG */
/* ========================================================================== */

const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24h

const DEFAULT_MAX_RETRIES = 3;

/**
 * Max processing lock duration before takeover.
 * Prevents deadlocks after crashes/timeouts.
 */
const PROCESSING_LOCK_TIMEOUT_MS = 1000 * 60 * 10; // 10 min

/* ========================================================================== */
/* HELPERS */
/* ========================================================================== */

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_, val) => {
    if (
      val &&
      typeof val === "object" &&
      !Array.isArray(val)
    ) {
      return Object.keys(val)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = val[key];

          return acc;
        }, {});
    }

    return val;
  });
}

function sha256(value: string): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function buildRequestHash(payload: unknown): string {
  return sha256(stableStringify(payload));
}

function now(): Date {
  return new Date();
}

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

function isLockExpired(updatedAt: Date): boolean {
  return (
    Date.now() - updatedAt.getTime() >
    PROCESSING_LOCK_TIMEOUT_MS
  );
}

function parseStoredResponse<T>(
  payload: Prisma.JsonValue | null,
): T | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const typed = payload as StoredResponse<T>;

  return typed.data ?? null;
}

/* ========================================================================== */
/* ERRORS */
/* ========================================================================== */

export class IdempotencyError extends Error {
  constructor(message: string) {
    super(message);

    this.name = "IdempotencyError";
  }
}

export class IdempotencyConflictError extends IdempotencyError {
  constructor(message: string) {
    super(message);

    this.name = "IdempotencyConflictError";
  }
}

export class IdempotencyProcessingError extends IdempotencyError {
  constructor(message: string) {
    super(message);

    this.name = "IdempotencyProcessingError";
  }
}

/* ========================================================================== */
/* CORE EXECUTOR */
/* ========================================================================== */

export async function executeIdempotent<T>(
  context: IdempotencyContext,
  // Ajout du paramètre tx obligatoire
  operation: (tx: Prisma.TransactionClient) => Promise<T>, 
): Promise<IdempotencyExecutionResult<T>> {

  const {
    scope,
    key,

    userId = null,

    method,
    route,

    requestBody,

    metadata,

    ttlSeconds = DEFAULT_TTL_SECONDS,

    maxRetries = DEFAULT_MAX_RETRIES,
  } = context;

  if (!scope) {
    throw new IdempotencyError(
      "Missing idempotency scope.",
    );
  }

  if (!key || key.trim().length < 8) {
    throw new IdempotencyError(
      "Idempotency key must contain at least 8 characters.",
    );
  }

  const requestHash =
    context.requestHash ??
    (requestBody
      ? buildRequestHash(requestBody)
      : null);

  const compositeKey = `${scope}:${key}`;

  const expiresAt = addSeconds(
    now(),
    ttlSeconds,
  );

  /* ====================================================================== */
  /* LOOKUP EXISTING RECORD */
  /* ====================================================================== */

  const existing =
    await prisma.idempotencyKey.findUnique({
      where: {
        key: compositeKey,
      },
    });

  if (existing) {
    /**
     * Same key with different payload = attack / bug.
     */
    if (
      existing.requestHash &&
      requestHash &&
      existing.requestHash !== requestHash
    ) {
      throw new IdempotencyConflictError(
        "Idempotency key reuse detected with different payload.",
      );
    }

    /**
     * Return cached successful result.
     */
    if (existing.status === "COMPLETED") {
      const cached =
        parseStoredResponse<T>(
          existing.responseBody,
        );

      if (cached !== null) {
        return {
          ok: true,

          fromCache: true,

          data: cached,

          recordId: existing.id,
        };
      }
    }

    /**
     * Prevent duplicate concurrent execution.
     */
    if (
      existing.status === "PROCESSING" &&
      !isLockExpired(existing.updatedAt)
    ) {
      throw new IdempotencyProcessingError(
        "Operation already processing.",
      );
    }

    /**
     * Hard retry limit.
     */
    if (
      existing.status === "FAILED" &&
      existing.retryCount >= maxRetries
    ) {
      return {
        ok: false,

        fromCache: true,

        error:
          "Maximum retry attempts reached.",

        recordId: existing.id,
      };
    }
  }

 try {
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Verrouillage / Création (identique à ton code, mais on garde 'tx' ouvert)
        const current = await tx.idempotencyKey.findUnique({ where: { key: compositeKey } });
        
        let record;
        if (!current) {
          record = await tx.idempotencyKey.create({ data: { id: uuidv7(), key: compositeKey, scope, status: "PROCESSING", userId, method, route, requestHash, metadata: metadata ?? Prisma.JsonNull, retryCount: 0, expiresAt } });
        } else if (current.status === "PROCESSING" && !isLockExpired(current.updatedAt)) {
          throw new IdempotencyProcessingError("Operation currently locked.");
        } else {
          record = await tx.idempotencyKey.update({
            where: { id: current.id },
            data: { status: "PROCESSING", retryCount: { increment: 1 }, expiresAt, updatedAt: now() },
          });
        }

        // 2. Exécution de la logique métier EN BDD
        const operationResult = await operation(tx);

        // 3. Complétion atomique
        const responsePayload: StoredResponse<T> = { data: operationResult, createdAt: now().toISOString() };
        
        await tx.idempotencyKey.update({
          where: { id: record.id },
          data: { status: "COMPLETED", completedAt: now(), responseBody: responsePayload as Prisma.InputJsonValue },
        });

        return { operationResult, recordId: record.id };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 }
    );

    return { ok: true, fromCache: false, data: result.operationResult, recordId: result.recordId };
    
  } catch (error) {
    const serializedError =
      error instanceof Error
        ? {
            name: error.name,

            message: error.message,

            stack:
              process.env.NODE_ENV ===
              "development"
                ? error.stack
                : undefined,
          }
        : {
            message: "Unknown error",
          };

    // We need to find the record to update its status to FAILED if the transaction failed.
    // This assumes that if an error occurs within the transaction,
    // the transaction is rolled back, and we need to update the record
    // outside of it.
    // However, if the error is an IdempotencyProcessingError, it means
    // the record already exists and is being processed by another instance,
    // so we don't need to update its status to FAILED.
    if (!(error instanceof IdempotencyProcessingError)) {
      const existingRecord = await prisma.idempotencyKey.findUnique({
        where: {
          key: compositeKey,
        },
      });

      if (existingRecord) {
        await prisma.idempotencyKey.update({
          where: {
            id: existingRecord.id,
          },

          data: {
            status: "FAILED",

            errorBody: serializedError as Prisma.InputJsonValue,
          },
        });
      }
    }

    throw error;
  }

/* ========================================================================== */
/* ID GENERATORS */
/* ========================================================================== */

export function generateIdempotencyKey(
  prefix?: string,
): string {
  const id = uuidv7();

  return prefix
    ? `${prefix}_${id}`
    : id;
}

export function buildWebhookIdempotencyKey(
  provider: string,
  eventId: string,
): string {
  return sha256(
    `${provider}:${eventId}`,
  );
}

export function buildCheckoutIdempotencyKey(
  userId: string,
  cartId: string,
): string {
  return sha256(
    `${userId}:${cartId}`,
  );
}

export function buildPaymentIdempotencyKey(
  orderId: string,
  transactionId: string,
): string {
  return sha256(
    `${orderId}:${transactionId}`,
  );
}

/* ========================================================================== */
/* CLEANUP */
/* ========================================================================== */

export async function cleanupExpiredIdempotencyKeys(): Promise<number> {
  const result =
    await prisma.idempotencyKey.deleteMany({
      where: {
        expiresAt: {
          lt: now(),
        },
      },
    });

  return result.count;
}

/* ========================================================================== */
/* USAGE EXAMPLES */
/* ========================================================================== */

/*

// =====================================================================
// CHECKOUT
// =====================================================================

const result = await executeIdempotent(
  {
    scope: "CHECKOUT",

    key: buildCheckoutIdempotencyKey(
      session.user.id,
      cart.id,
    ),

    userId: session.user.id,

    method: "POST",

    route: "/api/checkout",

    requestBody: payload,
  },

  async () => {
    return checkoutService.createOrder(
      payload,
    );
  },
);


// =====================================================================
// CINETPAY WEBHOOK
// =====================================================================

await executeIdempotent(
  {
    scope: "WEBHOOK",

    key: buildWebhookIdempotencyKey(
      "cinetpay",
      webhook.cpm_trans_id,
    ),

    requestBody: webhook,
  },

  async () => {
    return paymentService.processWebhook(
      webhook,
    );
  },
);


// =====================================================================
// RETRIES
// =====================================================================

await executeIdempotent(
  {
    scope: "RETRY",

    key: generateIdempotencyKey(
      "payment-retry",
    ),

    maxRetries: 5,
  },

  async () => {
    return retryFailedPayment();
  },
);

*/