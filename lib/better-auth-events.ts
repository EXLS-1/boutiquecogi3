// lib/better-auth-events.ts

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/utils/uuid";

export type BusinessEventAction =
  | "AUTH_SIGN_UP"
  | "AUTH_SIGN_IN"
  | "AUTH_SIGN_OUT"
  | "AUTH_PASSWORD_RESET"
  | "AUTH_VERIFY_EMAIL"
  | "AUTH_UPDATE_PROFILE";

export type BusinessEventEntityType = "AUTH" | "USER" | "SESSION";

type PublishInput = {
  action: BusinessEventAction;
  entityType?: BusinessEventEntityType;
  entityId?: string | null;
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Publie un événement métier lié à l'auth.
 * Objectif: centraliser l'écriture dans Prisma (AuditLog) pour alimenter l'UI d'audit.
 */
export async function publishAuthBusinessEvent(input: PublishInput) {
  const {
    action,
    entityType = "AUTH",
    entityId = null,
    userId = null,
    ip = null,
    userAgent = null,
    metadata = {},
  } = input;

  void prisma.auditLog
    .create({
      data: {
        id: generateUUIDv7(),
        action,
        entityType,
        entityId,
        userId: userId ?? undefined,
        ip,
        userAgent,
        metadata,
        createdAt: new Date(),
      },
    })
    .catch((err) => {
      console.error("[AUTH_HOOK] failed to persist auth event:", err);
    });

  return null;
}
