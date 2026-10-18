// lib/audit/audit.service.ts
// ============================================
// SERVICE PRINCIPAL D'AUDIT LOG
// ============================================
// Module server-side uniquement. Gère l'écriture et la lecture des logs d'audit.
"use server";

import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
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
  AUDIT_MAX_PAYLOAD_SIZE,
  AUDIT_SANITIZE_FIELDS,
} from "./constants";
import { getCurrentUserWithRole } from "@/lib/auth/rbac";

// ───────────────────────────────────────────
// HELPERS INTERNES
// ───────────────────────────────────────────

/**
 * Sanitize les données sensibles avant stockage
 */
function sanitizeData(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  
  const sanitized: Record<string, unknown> = { ...data };
  
  for (const field of AUDIT_SANITIZE_FIELDS) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }
  
  // Vérifie la taille
  const stringified = JSON.stringify(sanitized);
  if (stringified.length > AUDIT_MAX_PAYLOAD_SIZE) {
    return { _truncated: true, _size: stringified.length };
  }
  
  return sanitized;
}

function attachSeverity(payload: unknown, severity: string): unknown {
  const record =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : payload === undefined
        ? {}
        : { value: payload };

  return { ...record, __auditSeverity: severity };
}

function getAuditSeverity(log: {
  payload: unknown;
  status: string | null;
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

  return log.status === "FAILED" ? AUDIT_SEVERITY.ERROR : AUDIT_SEVERITY.INFO;
}

/**
 * Extrait les métadonnées de la requête
 */
async function extractRequestMetadata(): Promise<{
  ipAddress: string;
  userAgent: string;
  location?: string;
  browser?: string;
  os?: string;
  device?: string;
}> {
  const headersList = await headers();
  
  const ipAddress = 
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown";
  
  const userAgent = headersList.get("user-agent") || "unknown";
  
  // Parse user-agent pour extraire browser/os/device
  const browser = extractBrowser(userAgent);
  const os = extractOS(userAgent);
  const device = extractDevice(userAgent);
  
  return {
    ipAddress,
    userAgent,
    browser,
    os,
    device,
  };
}

function extractBrowser(ua: string): string {
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  return "Unknown";
}

function extractOS(ua: string): string {
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iOS")) return "iOS";
  return "Unknown";
}

function extractDevice(ua: string): string {
  if (ua.includes("Mobile")) return "Mobile";
  if (ua.includes("Tablet")) return "Tablet";
  return "Desktop";
}

// ───────────────────────────────────────────
// ÉCRITURE DES LOGS
// ───────────────────────────────────────────

/**
 * Enregistre un événement d'audit de manière asynchrone et sécurisée.
 * Ne bloque pas le thread principal pour optimiser les performances.
 */
export async function logAudit(data: AuditLogData): Promise<void> {
  try {
    const metadata = await extractRequestMetadata();
    
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
    
    // Sanitize les données sensibles
    const sanitizedOldValue = sanitizeData(data.oldValue);
    const sanitizedNewValue = sanitizeData(data.newValue);
    const sanitizedMetadata = sanitizeData(data.metadata);
    
    // Détermine la sévérité par défaut
    const severity = data.severity || (data.success === false ? AUDIT_SEVERITY.ERROR : AUDIT_SEVERITY.INFO);
    
    // Écrit le log en arrière-plan (fire-and-forget)
    void prisma.auditLog.create({
      data: {
        userId,
        roleLevel,
        action: data.action,
        entity: data.entity,
        entityType: data.entity,
        entityId: data.entityId,
        targetId: data.entityId,
        targetType: data.entity,
        oldValue: sanitizedOldValue ? JSON.parse(JSON.stringify(sanitizedOldValue)) : undefined,
        newValue: sanitizedNewValue ? JSON.parse(JSON.stringify(sanitizedNewValue)) : undefined,
        metadata: sanitizedMetadata ? JSON.parse(JSON.stringify(sanitizedMetadata)) : undefined,
        status: data.success === false ? "FAILED" : "SUCCESS",
        error: data.error,
        details: data.details,
        ipAddress: data.ipAddress || metadata.ipAddress,
        userAgent: data.userAgent || metadata.userAgent,
        browser: metadata.browser,
        os: metadata.os,
        device: metadata.device,
        duration: data.duration,
        payload: JSON.parse(JSON.stringify(attachSeverity(sanitizedMetadata, severity))),
      },
    }).catch((error) => {
      // Log l'erreur dans un système de monitoring sans faire planter la requête
      console.error("[AuditLog] Échec de l'écriture:", error);
    });
  } catch (error) {
    // Capture les erreurs critiques
    console.error("[AuditLog] Erreur critique:", error);
  }
}

/**
 * Version synchrone pour les cas critiques (à utiliser avec parcimonie)
 */
export async function logAuditSync(data: AuditLogData): Promise<void> {
  const metadata = await extractRequestMetadata();
  
  let userId = data.userId;
  let roleLevel = 0;
  
  if (!userId) {
    const userData = await getCurrentUserWithRole();
    if (userData) {
      userId = userData.user.id;
      roleLevel = userData.level;
    }
  }
  
  const sanitizedOldValue = sanitizeData(data.oldValue);
  const sanitizedNewValue = sanitizeData(data.newValue);
  const sanitizedMetadata = sanitizeData(data.metadata);
  
  const severity = data.severity || (data.success === false ? AUDIT_SEVERITY.ERROR : AUDIT_SEVERITY.INFO);
  
  await prisma.auditLog.create({
    data: {
      userId,
      roleLevel,
      action: data.action,
      entity: data.entity,
      entityType: data.entity,
      entityId: data.entityId,
      targetId: data.entityId,
      targetType: data.entity,
      oldValue: sanitizedOldValue ? JSON.parse(JSON.stringify(sanitizedOldValue)) : undefined,
      newValue: sanitizedNewValue ? JSON.parse(JSON.stringify(sanitizedNewValue)) : undefined,
      metadata: sanitizedMetadata ? JSON.parse(JSON.stringify(sanitizedMetadata)) : undefined,
      status: data.success === false ? "FAILED" : "SUCCESS",
      error: data.error,
      details: data.details,
      ipAddress: data.ipAddress || metadata.ipAddress,
      userAgent: data.userAgent || metadata.userAgent,
      browser: metadata.browser,
      os: metadata.os,
      device: metadata.device,
      duration: data.duration,
      payload: JSON.parse(JSON.stringify(attachSeverity(sanitizedMetadata, severity))),
    },
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
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);
  
  return {
    logs: logs.map((log) => ({
      ...log,
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
  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return log ? { ...log, severity: getAuditSeverity(log) } : null;
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
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });
  
  return result.count;
}
