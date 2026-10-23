// lib/audit/audit.service.ts
// ============================================
// SERVICE PRINCIPAL D'AUDIT LOG
// ============================================
// Module server-side uniquement. Gère l'écriture et la lecture des logs d'audit.
"use server";

import { prisma } from "@/lib/prisma";
import { AuditSeverity as PrismaAuditSeverity } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { recordAuditLog } from "@/server/services/audit.service";
import {
  AUDIT_ACTIONS,
  AUDIT_SEVERITY,
  type AuditLogData,
  type AuditLogFilter,
  type AuditLogQuery,
  type AuditLogStats,
} from "./types";
import {
  AUDIT_DEFAULT_LIMIT,
  AUDIT_MAX_LIMIT,
} from "./constants";
import { getCurrentUserWithRole } from "@/lib/auth/rbac";

// ───────────────────────────────────────────
// HELPERS INTERNES
// ───────────────────────────────────────────

function getAuditSeverity(log: {
  payload: unknown;
  status: string | null;
  severity?: string | null;
}): string {
  if (
    log.payload &&
    typeof log.payload === "object" &&
    !Array.isArray(log.payload)
  ) {
    const payload = log.payload as Record<string, unknown>;
    if (typeof payload.__auditSeverity === "string") {
      return payload.__auditSeverity;
    }
  }

  if (log.status === "FAILED") return AUDIT_SEVERITY.ERROR;
  return log.severity ?? AUDIT_SEVERITY.INFO;
}

// ───────────────────────────────────────────
// ÉCRITURE DES LOGS
// ───────────────────────────────────────────

/**
 * Met durablement l'événement dans l'outbox avant de rendre la main.
 * L'insertion finale dans audit_log est traitée par le worker cron.
 */
export async function logAudit(data: AuditLogData): Promise<void> {
  try {
    // Récupère l'utilisateur courant si non fourni
    let userId = data.userId;
    let roleLevel = 0;
    
    if (!userId) {
      const userData = await getCurrentUserWithRole();
      if (userData) {
        userId = userData.user.id;
        roleLevel = userData.level;
      }
    }

    const severity = data.severity || (data.success === false ? AUDIT_SEVERITY.ERROR : AUDIT_SEVERITY.INFO);
    await recordAuditLog({
      action: data.action,
      userId: userId ?? null,
      actorId: data.actorId ?? userId ?? "anonymous",
      actorType: data.actorType ?? (userId ? "user" : "anonymous"),
      impersonatedBy: data.impersonatedBy,
      roleLevel,
      targetId: data.entityId,
      targetType: data.entity,
      oldValue: data.oldValue,
      newValue: data.newValue,
      metadata: {
        ...(data.metadata ?? {}),
        __auditSeverity: severity,
        ...(data.duration !== undefined && { duration: data.duration }),
      },
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      sessionId: data.sessionId,
      traceId: data.traceId,
      reason: data.reason,
      status: data.success === false ? "FAILED" : "SUCCESS",
      error: data.error,
      errorCode: data.errorCode,
      details: data.details,
      severity:
        severity === AUDIT_SEVERITY.ERROR
          ? PrismaAuditSeverity.CRITICAL
          : severity,
    });
  } catch (error) {
    console.error("[AuditLog] Échec de l'enqueue:", error);
  }
}

/**
 * Version awaitée : garantit la persistance de l'événement dans l'outbox.
 */
export async function logAuditSync(data: AuditLogData): Promise<void> {
  let userId = data.userId;
  let roleLevel = 0;
  
  if (!userId) {
    const userData = await getCurrentUserWithRole();
    if (userData) {
      userId = userData.user.id;
      roleLevel = userData.level;
    }
  }

  const severity = data.severity || (data.success === false ? AUDIT_SEVERITY.ERROR : AUDIT_SEVERITY.INFO);
  await recordAuditLog({
    action: data.action,
    userId: userId ?? null,
    actorId: data.actorId ?? userId ?? "anonymous",
    actorType: data.actorType ?? (userId ? "user" : "anonymous"),
    impersonatedBy: data.impersonatedBy,
    roleLevel,
    targetId: data.entityId,
    targetType: data.entity,
    oldValue: data.oldValue,
    newValue: data.newValue,
    metadata: {
      ...(data.metadata ?? {}),
      __auditSeverity: severity,
      ...(data.duration !== undefined && { duration: data.duration }),
    },
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    sessionId: data.sessionId,
    traceId: data.traceId,
    reason: data.reason,
    status: data.success === false ? "FAILED" : "SUCCESS",
    error: data.error,
    errorCode: data.errorCode,
    details: data.details,
    severity:
      severity === AUDIT_SEVERITY.ERROR
        ? PrismaAuditSeverity.CRITICAL
        : severity,
  });
}

// ───────────────────────────────────────────
// LECTURE DES LOGS
// ───────────────────────────────────────────

/**
 * Récupère les logs d'audit avec filtrage et pagination
 */
export async function getAuditLogs(query: AuditLogQuery = {}): Promise<{
  logs: Array<{
    id: string;
    userId: string | null;
    user: { name: string | null; email: string } | null;
    action: string;
    entity: string | null;
    entityType: string | null;
    entityId: string | null;
    oldValue: unknown;
    newValue: unknown;
    metadata: unknown;
    severity: string;
    status: string | null;
    error: string | null;
    details: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    browser: string | null;
    os: string | null;
    device: string | null;
    duration: number | null;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { filter = {}, page = 1, limit = AUDIT_DEFAULT_LIMIT, orderBy = "createdAt", orderDirection = "desc" } = query;
  
  // Valide et limite la pagination
  const validLimit = Math.min(Math.max(limit, 1), AUDIT_MAX_LIMIT);
  const validPage = Math.max(page, 1);
  const skip = (validPage - 1) * validLimit;
  
  // Construit le filtre Prisma
  const where: Prisma.AuditLogWhereInput = {};
  
  if (filter.userId) where.userId = filter.userId;
  if (filter.action) where.action = filter.action;
  if (filter.entity) where.entity = filter.entity;
  if (filter.entityId) where.entityId = filter.entityId;
  if (filter.severity) {
    where.payload = {
      path: ["__auditSeverity"],
      equals: filter.severity,
    };
  }
  
  if (filter.startDate || filter.endDate) {
    where.createdAt = {
      ...(filter.startDate ? { gte: filter.startDate } : {}),
      ...(filter.endDate ? { lte: filter.endDate } : {}),
    };
  }
  
  if (filter.search) {
    where.OR = [
      { action: { contains: filter.search, mode: "insensitive" } },
      { entity: { contains: filter.search, mode: "insensitive" } },
      { details: { contains: filter.search, mode: "insensitive" } },
      { error: { contains: filter.search, mode: "insensitive" } },
    ];
  }
  
  // Exécute la requête
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { [orderBy]: orderDirection },
      skip,
      take: validLimit,
    }),
    prisma.auditLog.count({ where }),
  ]);
  
  return {
    logs: logs.map((log) => ({
      ...log,
      user:
        log.userId || log.actorName || log.actorEmail
          ? {
              name: log.actorName,
              email: log.actorEmail ?? "",
            }
          : null,
      severity: getAuditSeverity(log),
    })),
    total,
    page: validPage,
    limit: validLimit,
    totalPages: Math.ceil(total / validLimit),
  };
}

/**
 * Récupère un log spécifique par ID
 */
export async function getAuditLogById(id: string) {
  const log = await prisma.auditLog.findFirst({
    where: { id },
  });

  return log
    ? {
        ...log,
        user:
          log.userId || log.actorName || log.actorEmail
            ? {
                id: log.userId,
                name: log.actorName,
                email: log.actorEmail ?? "",
                roleLevel: log.roleLevel,
              }
            : null,
        severity: getAuditSeverity(log),
      }
    : null;
}

/**
 * Récupère les statistiques d'audit
 */
export async function getAuditStats(days: number = 30): Promise<AuditLogStats> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: startDate },
    },
    select: {
      action: true,
      entity: true,
      payload: true,
      status: true,
      severity: true,
      createdAt: true,
    },
  });
  
  // Agrège les données
  const byAction: Record<string, number> = {};
  const byEntity: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byDayMap: Map<string, number> = new Map();
  
  for (const log of logs) {
    byAction[log.action] = (byAction[log.action] || 0) + 1;
    if (log.entity) byEntity[log.entity] = (byEntity[log.entity] || 0) + 1;
    const severity = getAuditSeverity(log);
    bySeverity[severity] = (bySeverity[severity] || 0) + 1;
    
    const dateKey = log.createdAt.toISOString().split("T")[0];
    byDayMap.set(dateKey, (byDayMap.get(dateKey) || 0) + 1);
  }
  
  const byDay = Array.from(byDayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  return {
    total: logs.length,
    byAction,
    byEntity,
    bySeverity,
    byDay,
  };
}

// ───────────────────────────────────────────
// NETTOYAGE
// ───────────────────────────────────────────

/**
 * Supprime les logs plus anciens que la rétention configurée
 */
export async function cleanupOldAuditLogs(retentionDays: number = 365): Promise<number> {
  throw new Error(
    `Audit logs are append-only. Archive partitions before removing data older than ${retentionDays} days.`,
  );
}
