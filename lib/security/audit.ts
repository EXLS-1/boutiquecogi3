/**
 * =============================================================================
 * BOUTIQUECOGI3 — SECURITY AUDIT LOGGING SYSTEM
 * =============================================================================
 * Ce fichier implémente un système d'audit logging complet avec catégorisation par type d'événement,
 * intégration RBAC et persistance dans Upstash Redis (avec fallback Prisma pour les événements critiques).
 * Architecture: Modular, Atomic, Tamper-Resistant
 * Stack: Upstash Redis (stream) + Prisma (persistent) + UUID v7
 * RBAC Integration: All levels (1-6) + GUEST
 * Event Categories: Super-Admin/Admin, Payment, User, Security
 * 
 * LEVEL 1 = SUPER-ADMIN  |  LEVEL 2 = ADMIN
 * LEVEL 3 = MANAGER      |  LEVEL 4 = EDITOR
 * LEVEL 5 = SUPERVISOR   |  LEVEL 6 = USER
 * GUEST = Unauthenticated public sessions
 * =============================================================================
 */

import { Redis } from "@upstash/redis";
import { uuidv7 } from "uuidv7";
import { type NextRequest } from "next/server";
import { headers } from "next/headers";

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT & REDIS CLIENT
// ─────────────────────────────────────────────────────────────────────────────

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  throw new Error(
    "[AUDIT] Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables"
  );
}

/**
 * Dedicated Redis client for audit logs (isolated from rate limiting).
 */
const auditRedis = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN,
  cache: "no-store",
});

// ─────────────────────────────────────────────────────────────────────────────
// RBAC LEVEL TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export type RBACLevel = 
  | "LEVEL_1"   // SUPER-ADMIN
  | "LEVEL_2"   // ADMIN
  | "LEVEL_3"   // MANAGER
  | "LEVEL_4"   // EDITOR
  | "LEVEL_5"   // SUPERVISOR
  | "LEVEL_6"   // USER
  | "GUEST";    // Unauthenticated

export type NumericLevel = 1 | 2 | 3 | 4 | 5 | 6 | 0; // 0 = GUEST

// ─────────────────────────────────────────────────────────────────────────────
// EVENT CATEGORY ENUMS (Strict Typing for Atomicity)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Super-Admin & Admin Events — Highest privilege operations
 * These events require immediate alerting and immutable logging.
 */
export enum SuperAdminEvent {
  // Role & Permission Management
  ROLE_CREATED = "SUPERADMIN:ROLE_CREATED",
  ROLE_UPDATED = "SUPERADMIN:ROLE_UPDATED",
  ROLE_DELETED = "SUPERADMIN:ROLE_DELETED",
  PERMISSION_GRANTED = "SUPERADMIN:PERMISSION_GRANTED",
  PERMISSION_REVOKED = "SUPERADMIN:PERMISSION_REVOKED",
  
  // System Configuration
  SYSTEM_CONFIG_CHANGED = "SUPERADMIN:SYSTEM_CONFIG_CHANGED",
  RATE_LIMIT_POLICY_MODIFIED = "SUPERADMIN:RATE_LIMIT_POLICY_MODIFIED",
  SECURITY_POLICY_UPDATED = "SUPERADMIN:SECURITY_POLICY_UPDATED",
  
  // User Elevation
  USER_PROMOTED = "SUPERADMIN:USER_PROMOTED",
  USER_DEMOTED = "SUPERADMIN:USER_DEMOTED",
  ADMIN_CREATED = "SUPERADMIN:ADMIN_CREATED",
  ADMIN_DEACTIVATED = "SUPERADMIN:ADMIN_DEACTIVATED",
  
  // Data Access
  DATABASE_EXPORT = "SUPERADMIN:DATABASE_EXPORT",
  AUDIT_LOG_ACCESS = "SUPERADMIN:AUDIT_LOG_ACCESS",
  BACKUP_TRIGGERED = "SUPERADMIN:BACKUP_TRIGGERED",
}

/**
 * Admin Events — Administrative operations (Level 2)
 */
export enum AdminEvent {
  // Content Management
  PRODUCT_CREATED = "ADMIN:PRODUCT_CREATED",
  PRODUCT_UPDATED = "ADMIN:PRODUCT_UPDATED",
  PRODUCT_DELETED = "ADMIN:PRODUCT_DELETED",
  CATEGORY_CREATED = "ADMIN:CATEGORY_CREATED",
  CATEGORY_DELETED = "ADMIN:CATEGORY_DELETED",
  
  // Order Management
  ORDER_STATUS_CHANGED = "ADMIN:ORDER_STATUS_CHANGED",
  ORDER_REFUND_INITIATED = "ADMIN:ORDER_REFUND_INITIATED",
  ORDER_CANCELLED = "ADMIN:ORDER_CANCELLED",
  
  // User Management
  USER_BLOCKED = "ADMIN:USER_BLOCKED",
  USER_UNBLOCKED = "ADMIN:USER_UNBLOCKED",
  USER_DATA_EXPORTED = "ADMIN:USER_DATA_EXPORTED",
  
  // Inventory
  INVENTORY_UPDATED = "ADMIN:INVENTORY_UPDATED",
  STOCK_ALERT_CONFIGURED = "ADMIN:STOCK_ALERT_CONFIGURED",
}

/**
 * Payment Events — Financial transactions (CinetPay integration)
 */
export enum PaymentEvent {
  // Transaction Lifecycle
  PAYMENT_INITIATED = "PAYMENT:INITIATED",
  PAYMENT_PENDING = "PAYMENT:PENDING",
  PAYMENT_SUCCESS = "PAYMENT:SUCCESS",
  PAYMENT_FAILED = "PAYMENT:FAILED",
  PAYMENT_CANCELLED = "PAYMENT:CANCELLED",
  PAYMENT_REFUNDED = "PAYMENT:REFUNDED",
  PAYMENT_CHARGEBACK = "PAYMENT:CHARGEBACK",
  
  // CinetPay Specific
  CINETPAY_CALLBACK_RECEIVED = "PAYMENT:CINETPAY_CALLBACK",
  CINETPAY_SIGNATURE_VERIFIED = "PAYMENT:CINETPAY_SIGNATURE_VERIFIED",
  CINETPAY_SIGNATURE_INVALID = "PAYMENT:CINETPAY_SIGNATURE_INVALID",
  CINETPAY_WEBHOOK_PROCESSED = "PAYMENT:CINETPAY_WEBHOOK_PROCESSED",
  
  // Financial
  INVOICE_GENERATED = "PAYMENT:INVOICE_GENERATED",
  PAYOUT_INITIATED = "PAYMENT:PAYOUT_INITIATED",
  PAYOUT_COMPLETED = "PAYMENT:PAYOUT_COMPLETED",
  CURRENCY_CONVERTED = "PAYMENT:CURRENCY_CONVERTED",
}

/**
 * User Events — Standard user activities (Level 6)
 */
export enum UserEvent {
  // Authentication
  LOGIN_SUCCESS = "USER:LOGIN_SUCCESS",
  LOGIN_FAILED = "USER:LOGIN_FAILED",
  LOGOUT = "USER:LOGOUT",
  SESSION_CREATED = "USER:SESSION_CREATED",
  SESSION_EXPIRED = "USER:SESSION_EXPIRED",
  SESSION_REVOKED = "USER:SESSION_REVOKED",
  PASSWORD_CHANGED = "USER:PASSWORD_CHANGED",
  PASSWORD_RESET_REQUESTED = "USER:PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED = "USER:PASSWORD_RESET_COMPLETED",
  MFA_ENABLED = "USER:MFA_ENABLED",
  MFA_DISABLED = "USER:MFA_DISABLED",
  
  // Profile
  PROFILE_UPDATED = "USER:PROFILE_UPDATED",
  EMAIL_CHANGED = "USER:EMAIL_CHANGED",
  ADDRESS_ADDED = "USER:ADDRESS_ADDED",
  ADDRESS_DELETED = "USER:ADDRESS_DELETED",
  
  // Shopping
  CART_ITEM_ADDED = "USER:CART_ITEM_ADDED",
  CART_ITEM_REMOVED = "USER:CART_ITEM_REMOVED",
  WISHLIST_ITEM_ADDED = "USER:WISHLIST_ITEM_ADDED",
  ORDER_PLACED = "USER:ORDER_PLACED",
  ORDER_TRACKED = "USER:ORDER_TRACKED",
  REVIEW_SUBMITTED = "USER:REVIEW_SUBMITTED",
  
  // Communication
  NEWSLETTER_SUBSCRIBED = "USER:NEWSLETTER_SUBSCRIBED",
  CONTACT_FORM_SUBMITTED = "USER:CONTACT_FORM_SUBMITTED",
}

/**
 * Security Events — Threat detection and incident response
 */
export enum SecurityEvent {
  // Authentication Threats
  BRUTE_FORCE_DETECTED = "SECURITY:BRUTE_FORCE_DETECTED",
  SUSPICIOUS_LOGIN_ATTEMPT = "SECURITY:SUSPICIOUS_LOGIN_ATTEMPT",
  ACCOUNT_LOCKOUT = "SECURITY:ACCOUNT_LOCKOUT",
  CREDENTIAL_STUFFING_DETECTED = "SECURITY:CREDENTIAL_STUFFING_DETECTED",
  
  // Access Violations
  UNAUTHORIZED_ACCESS_ATTEMPT = "SECURITY:UNAUTHORIZED_ACCESS_ATTEMPT",
  PRIVILEGE_ESCALATION_ATTEMPT = "SECURITY:PRIVILEGE_ESCALATION_ATTEMPT",
  RBAC_VIOLATION = "SECURITY:RBAC_VIOLATION",
  FORBIDDEN_RESOURCE_ACCESS = "SECURITY:FORBIDDEN_RESOURCE_ACCESS",
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = "SECURITY:RATE_LIMIT_EXCEEDED",
  BURST_LIMIT_EXCEEDED = "SECURITY:BURST_LIMIT_EXCEEDED",
  DDOS_PATTERN_DETECTED = "SECURITY:DDOS_PATTERN_DETECTED",
  
  // Data Integrity
  DATA_INTEGRITY_VIOLATION = "SECURITY:DATA_INTEGRITY_VIOLATION",
  TAMPERING_DETECTED = "SECURITY:TAMPERING_DETECTED",
  CSRF_TOKEN_INVALID = "SECURITY:CSRF_TOKEN_INVALID",
  XSS_ATTEMPT_BLOCKED = "SECURITY:XSS_ATTEMPT_BLOCKED",
  SQL_INJECTION_ATTEMPT = "SECURITY:SQL_INJECTION_ATTEMPT",
  
  // System
  CONFIGURATION_DRIFT = "SECURITY:CONFIGURATION_DRIFT",
  CERTIFICATE_EXPIRED = "SECURITY:CERTIFICATE_EXPIRED",
  SUSPICIOUS_IP_DETECTED = "SECURITY:SUSPICIOUS_IP_DETECTED",
  TOR_EXIT_NODE_ACCESS = "SECURITY:TOR_EXIT_NODE_ACCESS",
}

/**
 * Union type of all audit event types.
 */
export type AuditEventType = 
  | SuperAdminEvent 
  | AdminEvent 
  | PaymentEvent 
  | UserEvent 
  | SecurityEvent;

// ─────────────────────────────────────────────────────────────────────────────
// SEVERITY LEVELS (For Alerting & Retention Policies)
// ─────────────────────────────────────────────────────────────────────────────

export enum Severity {
  CRITICAL = "CRITICAL",   // Immediate alert, 7-year retention
  HIGH = "HIGH",           // Alert within 15 min, 3-year retention
  MEDIUM = "MEDIUM",       // Daily digest, 1-year retention
  LOW = "LOW",             // Weekly digest, 90-day retention
  INFO = "INFO",           // Monthly report, 30-day retention
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG ENTRY STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  // Core Identity
  id: string;                    // UUID v7 (time-ordered, sortable)
  timestamp: string;               // ISO 8601 UTC
  eventType: AuditEventType;
  severity: Severity;
  
  // Actor Information
  actorId: string | null;        // User ID or null for GUEST
  actorLevel: RBACLevel;
  actorEmail: string | null;
  sessionId: string | null;
  
  // Target Information
  targetId: string | null;       // Affected resource ID
  targetType: string | null;     // Resource type (user, product, order, etc.)
  
  // Context
  ipAddress: string | null;
  userAgent: string | null;
  requestPath: string | null;
  requestMethod: string | null;
  correlationId: string | null;  // For distributed tracing
  
  // Payload (sanitized)
  metadata: Record<string, unknown>;
  
  // Integrity
  hash: string;                  // SHA-256 of serialized entry (tamper detection)
  previousHash: string | null;   // Blockchain-style chaining for critical events
}

// ─────────────────────────────────────────────────────────────────────────────
// SEVERITY MAPPING (Event → Severity)
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_MAP: Record<AuditEventType, Severity> = {
  // SuperAdmin Events — CRITICAL
  [SuperAdminEvent.ROLE_CREATED]: Severity.CRITICAL,
  [SuperAdminEvent.ROLE_UPDATED]: Severity.CRITICAL,
  [SuperAdminEvent.ROLE_DELETED]: Severity.CRITICAL,
  [SuperAdminEvent.PERMISSION_GRANTED]: Severity.CRITICAL,
  [SuperAdminEvent.PERMISSION_REVOKED]: Severity.CRITICAL,
  [SuperAdminEvent.SYSTEM_CONFIG_CHANGED]: Severity.CRITICAL,
  [SuperAdminEvent.RATE_LIMIT_POLICY_MODIFIED]: Severity.CRITICAL,
  [SuperAdminEvent.SECURITY_POLICY_UPDATED]: Severity.CRITICAL,
  [SuperAdminEvent.USER_PROMOTED]: Severity.CRITICAL,
  [SuperAdminEvent.USER_DEMOTED]: Severity.CRITICAL,
  [SuperAdminEvent.ADMIN_CREATED]: Severity.CRITICAL,
  [SuperAdminEvent.ADMIN_DEACTIVATED]: Severity.CRITICAL,
  [SuperAdminEvent.DATABASE_EXPORT]: Severity.CRITICAL,
  [SuperAdminEvent.AUDIT_LOG_ACCESS]: Severity.CRITICAL,
  [SuperAdminEvent.BACKUP_TRIGGERED]: Severity.HIGH,
  
  // Admin Events — HIGH
  [AdminEvent.PRODUCT_CREATED]: Severity.MEDIUM,
  [AdminEvent.PRODUCT_UPDATED]: Severity.MEDIUM,
  [AdminEvent.PRODUCT_DELETED]: Severity.HIGH,
  [AdminEvent.CATEGORY_CREATED]: Severity.MEDIUM,
  [AdminEvent.CATEGORY_DELETED]: Severity.HIGH,
  [AdminEvent.ORDER_STATUS_CHANGED]: Severity.HIGH,
  [AdminEvent.ORDER_REFUND_INITIATED]: Severity.HIGH,
  [AdminEvent.ORDER_CANCELLED]: Severity.HIGH,
  [AdminEvent.USER_BLOCKED]: Severity.HIGH,
  [AdminEvent.USER_UNBLOCKED]: Severity.MEDIUM,
  [AdminEvent.USER_DATA_EXPORTED]: Severity.CRITICAL,
  [AdminEvent.INVENTORY_UPDATED]: Severity.MEDIUM,
  [AdminEvent.STOCK_ALERT_CONFIGURED]: Severity.LOW,
  
  // Payment Events — CRITICAL/HIGH
  [PaymentEvent.PAYMENT_INITIATED]: Severity.MEDIUM,
  [PaymentEvent.PAYMENT_PENDING]: Severity.LOW,
  [PaymentEvent.PAYMENT_SUCCESS]: Severity.MEDIUM,
  [PaymentEvent.PAYMENT_FAILED]: Severity.MEDIUM,
  [PaymentEvent.PAYMENT_CANCELLED]: Severity.MEDIUM,
  [PaymentEvent.PAYMENT_REFUNDED]: Severity.HIGH,
  [PaymentEvent.PAYMENT_CHARGEBACK]: Severity.CRITICAL,
  [PaymentEvent.CINETPAY_CALLBACK_RECEIVED]: Severity.MEDIUM,
  [PaymentEvent.CINETPAY_SIGNATURE_VERIFIED]: Severity.HIGH,
  [PaymentEvent.CINETPAY_SIGNATURE_INVALID]: Severity.CRITICAL,
  [PaymentEvent.CINETPAY_WEBHOOK_PROCESSED]: Severity.MEDIUM,
  [PaymentEvent.INVOICE_GENERATED]: Severity.LOW,
  [PaymentEvent.PAYOUT_INITIATED]: Severity.HIGH,
  [PaymentEvent.PAYOUT_COMPLETED]: Severity.MEDIUM,
  [PaymentEvent.CURRENCY_CONVERTED]: Severity.LOW,
  
  // User Events — LOW/INFO
  [UserEvent.LOGIN_SUCCESS]: Severity.LOW,
  [UserEvent.LOGIN_FAILED]: Severity.MEDIUM,
  [UserEvent.LOGOUT]: Severity.INFO,
  [UserEvent.SESSION_CREATED]: Severity.LOW,
  [UserEvent.SESSION_EXPIRED]: Severity.INFO,
  [UserEvent.SESSION_REVOKED]: Severity.MEDIUM,
  [UserEvent.PASSWORD_CHANGED]: Severity.MEDIUM,
  [UserEvent.PASSWORD_RESET_REQUESTED]: Severity.LOW,
  [UserEvent.PASSWORD_RESET_COMPLETED]: Severity.MEDIUM,
  [UserEvent.MFA_ENABLED]: Severity.LOW,
  [UserEvent.MFA_DISABLED]: Severity.HIGH,
  [UserEvent.PROFILE_UPDATED]: Severity.INFO,
  [UserEvent.EMAIL_CHANGED]: Severity.MEDIUM,
  [UserEvent.ADDRESS_ADDED]: Severity.INFO,
  [UserEvent.ADDRESS_DELETED]: Severity.INFO,
  [UserEvent.CART_ITEM_ADDED]: Severity.INFO,
  [UserEvent.CART_ITEM_REMOVED]: Severity.INFO,
  [UserEvent.WISHLIST_ITEM_ADDED]: Severity.INFO,
  [UserEvent.ORDER_PLACED]: Severity.LOW,
  [UserEvent.ORDER_TRACKED]: Severity.INFO,
  [UserEvent.REVIEW_SUBMITTED]: Severity.INFO,
  [UserEvent.NEWSLETTER_SUBSCRIBED]: Severity.INFO,
  [UserEvent.CONTACT_FORM_SUBMITTED]: Severity.INFO,
  
  // Security Events — CRITICAL
  [SecurityEvent.BRUTE_FORCE_DETECTED]: Severity.CRITICAL,
  [SecurityEvent.SUSPICIOUS_LOGIN_ATTEMPT]: Severity.HIGH,
  [SecurityEvent.ACCOUNT_LOCKOUT]: Severity.HIGH,
  [SecurityEvent.CREDENTIAL_STUFFING_DETECTED]: Severity.CRITICAL,
  [SecurityEvent.UNAUTHORIZED_ACCESS_ATTEMPT]: Severity.HIGH,
  [SecurityEvent.PRIVILEGE_ESCALATION_ATTEMPT]: Severity.CRITICAL,
  [SecurityEvent.RBAC_VIOLATION]: Severity.CRITICAL,
  [SecurityEvent.FORBIDDEN_RESOURCE_ACCESS]: Severity.HIGH,
  [SecurityEvent.RATE_LIMIT_EXCEEDED]: Severity.MEDIUM,
  [SecurityEvent.BURST_LIMIT_EXCEEDED]: Severity.MEDIUM,
  [SecurityEvent.DDOS_PATTERN_DETECTED]: Severity.CRITICAL,
  [SecurityEvent.DATA_INTEGRITY_VIOLATION]: Severity.CRITICAL,
  [SecurityEvent.TAMPERING_DETECTED]: Severity.CRITICAL,
  [SecurityEvent.CSRF_TOKEN_INVALID]: Severity.HIGH,
  [SecurityEvent.XSS_ATTEMPT_BLOCKED]: Severity.HIGH,
  [SecurityEvent.SQL_INJECTION_ATTEMPT]: Severity.CRITICAL,
  [SecurityEvent.CONFIGURATION_DRIFT]: Severity.MEDIUM,
  [SecurityEvent.CERTIFICATE_EXPIRED]: Severity.HIGH,
  [SecurityEvent.SUSPICIOUS_IP_DETECTED]: Severity.MEDIUM,
  [SecurityEvent.TOR_EXIT_NODE_ACCESS]: Severity.MEDIUM,
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT RESOLUTION (Request → Structured Context)
// ─────────────────────────────────────────────────────────────────────────────

interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
  requestPath: string | null;
  requestMethod: string | null;
  correlationId: string | null;
}

/**
 * Extracts request context for audit logging.
 * Works with both NextRequest and Server Action contexts.
 */
async function resolveRequestContext(
  request?: NextRequest
): Promise<RequestContext> {
  const headersList = await headers();
  
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  
  return {
    ipAddress: forwardedFor?.split(",")[0]?.trim() 
      || realIp 
      || request?.ip 
      || null,
    userAgent: headersList.get("user-agent") || null,
    requestPath: request?.nextUrl?.pathname || headersList.get("x-request-path") || null,
    requestMethod: request?.method || headersList.get("x-request-method") || null,
    correlationId: headersList.get("x-correlation-id") || crypto.randomUUID(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HASHING & INTEGRITY (Tamper Detection)
// ─────────────────────────────────────────────────────────────────────────────

let lastCriticalHash: string | null = null;

/**
 * Generates SHA-256 hash for audit entry integrity.
 * Critical events use blockchain-style chaining.
 */
async function generateEntryHash(entry: Omit<AuditLogEntry, "hash" | "previousHash">): Promise<{ hash: string; previousHash: string | null }> {
  const isCritical = entry.severity === Severity.CRITICAL;
  
  const payload = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    eventType: entry.eventType,
    actorId: entry.actorId,
    targetId: entry.targetId,
    metadata: entry.metadata,
  });
  
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(payload));
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  
  const previousHash = isCritical ? lastCriticalHash : null;
  if (isCritical) {
    lastCriticalHash = hash;
  }
  
  return { hash, previousHash };
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE AUDIT LOGGING FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditLogOptions {
  eventType: AuditEventType;
  actorId?: string | null;
  actorLevel?: RBACLevel;
  actorEmail?: string | null;
  sessionId?: string | null;
  targetId?: string | null;
  targetType?: string | null;
  metadata?: Record<string, unknown>;
  request?: NextRequest;
  correlationId?: string | null;
}

/**
 * Main audit logging function.
 * Writes to Redis Stream (fast) with optional Prisma persistence (critical events).
 * 
 * Performance: Non-blocking for standard events, blocking for CRITICAL.
 */
export async function auditLog(options: AuditLogOptions): Promise<AuditLogEntry> {
  const {
    eventType,
    actorId = null,
    actorLevel = "GUEST",
    actorEmail = null,
    sessionId = null,
    targetId = null,
    targetType = null,
    metadata = {},
    request,
    correlationId: explicitCorrelationId,
  } = options;

  // Resolve severity
  const severity = SEVERITY_MAP[eventType] || Severity.INFO;

  // Resolve request context
  const context = await resolveRequestContext(request);
  const correlationId = explicitCorrelationId || context.correlationId;

  // Generate UUID v7 (time-ordered, sortable, no collision risk)
  const id = uuidv7();
  const timestamp = new Date().toISOString();

  // Build entry (without hash for now)
  const entryBase = {
    id,
    timestamp,
    eventType,
    severity,
    actorId,
    actorLevel,
    actorEmail,
    sessionId,
    targetId,
    targetType,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestPath: context.requestPath,
    requestMethod: context.requestMethod,
    correlationId,
    metadata: sanitizeMetadata(metadata),
  };

  // Generate integrity hash
  const { hash, previousHash } = await generateEntryHash(entryBase);

  const entry: AuditLogEntry = {
    ...entryBase,
    hash,
    previousHash,
  };

  // ── Async Write to Redis Stream (non-blocking) ──
  writeToRedisStream(entry).catch(err => {
    console.error(`[AUDIT] Redis stream write failed: ${err.message}`);
    // Fallback: console output ensures no silent failures
    console.error(`[AUDIT-FALLBACK] ${JSON.stringify(entry)}`);
  });

  // ── Critical Events: Also persist to Prisma (blocking) ──
  if (severity === Severity.CRITICAL) {
    await persistCriticalEvent(entry).catch(err => {
      console.error(`[AUDIT] Critical event persistence failed: ${err.message}`);
    });
  }

  // ── Real-time Alerting for Critical/High Events ──
  if (severity === Severity.CRITICAL || severity === Severity.HIGH) {
    triggerAlert(entry).catch(err => {
      console.error(`[AUDIT] Alert trigger failed: ${err.message}`);
    });
  }

  return entry;
}

// ─────────────────────────────────────────────────────────────────────────────
// REDIS STREAM WRITER (High-Performance)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Writes audit entry to Redis Stream for real-time processing.
 * Uses Redis Streams for durability and consumer group support.
 */
async function writeToRedisStream(entry: AuditLogEntry): Promise<void> {
  const streamKey = `audit:stream:${entry.severity.toLowerCase()}`;
  
  await auditRedis.xadd(streamKey, "*", {
    entry: JSON.stringify(entry),
    timestamp: entry.timestamp,
    eventType: entry.eventType,
    actorId: entry.actorId || "anonymous",
    severity: entry.severity,
  });
  
  // Trim stream to prevent unbounded growth (keep last 10,000 per severity)
  await auditRedis.xtrim(streamKey, "MAXLEN", "~", 10000);
}

// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL EVENT PERSISTENCE (Prisma Fallback)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persists critical events to Prisma database for long-term retention.
 * This is a fallback for compliance and forensic investigation.
 */
async function persistCriticalEvent(entry: AuditLogEntry): Promise<void> {
  // Dynamic import to avoid circular dependencies and reduce startup time
  const { prisma } = await import("@/lib/prisma");
  
  await prisma.auditLog.create({
    data: {
      id: entry.id,
      timestamp: new Date(entry.timestamp),
      eventType: entry.eventType,
      severity: entry.severity,
      actorId: entry.actorId,
      actorLevel: entry.actorLevel,
      actorEmail: entry.actorEmail,
      sessionId: entry.sessionId,
      targetId: entry.targetId,
      targetType: entry.targetType,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      requestPath: entry.requestPath,
      requestMethod: entry.requestMethod,
      correlationId: entry.correlationId,
      metadata: entry.metadata,
      hash: entry.hash,
      previousHash: entry.previousHash,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERTING SYSTEM (Security Operations)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Triggers real-time alerts for high/critical security events.
 * Can integrate with Slack, PagerDuty, email, or custom webhooks.
 */
async function triggerAlert(entry: AuditLogEntry): Promise<void> {
  const alertPayload = {
    severity: entry.severity,
    event: entry.eventType,
    actor: entry.actorId || "GUEST",
    actorLevel: entry.actorLevel,
    target: entry.targetId,
    ip: entry.ipAddress,
    timestamp: entry.timestamp,
    correlationId: entry.correlationId,
    message: `[${entry.severity}] ${entry.eventType} by ${entry.actorId || "GUEST"} (${entry.actorLevel})`,
  };

  // Write to Redis Pub/Sub channel for real-time consumers
  await auditRedis.publish("audit:alerts", JSON.stringify(alertPayload));

  // Console alert for immediate visibility (replace with webhook/Slack in production)
  console.warn(
    `[SECURITY-ALERT] ${alertPayload.message} | IP: ${entry.ipAddress} | Target: ${entry.targetId}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// METADATA SANITIZATION (PII Protection)
// ─────────────────────────────────────────────────────────────────────────────

const SENSITIVE_KEYS = [
  "password", "token", "secret", "apiKey", "api_key",
  "creditCard", "cvv", "ssn", "authorization", "cookie",
  "sessionToken", "refreshToken", "privateKey", "cinetPayToken",
];

/**
 * Sanitizes metadata to prevent PII/sensitive data leakage in logs.
 */
function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    
    if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk.toLowerCase()))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.length > 1000) {
      // Truncate long strings to prevent log bloat
      sanitized[key] = value.slice(0, 1000) + "...[TRUNCATED]";
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE WRAPPERS (Domain-Specific APIs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Logs Super-Admin & Admin events.
 * Requires LEVEL 1 or LEVEL 2 privileges.
 */
export async function logAdminEvent(
  event: SuperAdminEvent | AdminEvent,
  options: Omit<AuditLogOptions, "eventType">
): Promise<AuditLogEntry> {
  return auditLog({ ...options, eventType: event });
}

/**
 * Logs payment events (CinetPay integration).
 */
export async function logPaymentEvent(
  event: PaymentEvent,
  options: Omit<AuditLogOptions, "eventType">
): Promise<AuditLogEntry> {
  return auditLog({ ...options, eventType: event });
}

/**
 * Logs user lifecycle events.
 */
export async function logUserEvent(
  event: UserEvent,
  options: Omit<AuditLogOptions, "eventType">
): Promise<AuditLogEntry> {
  return auditLog({ ...options, eventType: event });
}

/**
 * Logs security events (threats, violations, incidents).
 */
export async function logSecurityEvent(
  event: SecurityEvent,
  options: Omit<AuditLogOptions, "eventType">
): Promise<AuditLogEntry> {
  return auditLog({ ...options, eventType: event });
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERY & RETRIEVAL API (For Admin Dashboards)
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditQueryOptions {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: AuditEventType[];
  severities?: Severity[];
  actorId?: string;
  actorLevels?: RBACLevel[];
  targetId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Retrieves audit logs from Prisma (persistent store).
 * For real-time queries, use Redis Stream consumers.
 */
export async function queryAuditLogs(
  options: AuditQueryOptions = {}
): Promise<{ entries: AuditLogEntry[]; total: number }> {
  const { prisma } = await import("@/lib/prisma");
  
  const where: Record<string, unknown> = {};
  
  if (options.startDate || options.endDate) {
    where.timestamp = {};
    if (options.startDate) (where.timestamp as Record<string, Date>).gte = options.startDate;
    if (options.endDate) (where.timestamp as Record<string, Date>).lte = options.endDate;
  }
  
  if (options.eventTypes?.length) where.eventType = { in: options.eventTypes };
  if (options.severities?.length) where.severity = { in: options.severities };
  if (options.actorId) where.actorId = options.actorId;
  if (options.actorLevels?.length) where.actorLevel = { in: options.actorLevels };
  if (options.targetId) where.targetId = options.targetId;

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: options.limit || 100,
      skip: options.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    entries: entries.map(e => ({
      ...e,
      metadata: e.metadata as Record<string, unknown>,
      timestamp: e.timestamp.toISOString(),
    })),
    total,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAM CONSUMER (For Real-Time Processing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consumes audit events from Redis Stream for real-time processing.
 * Use in a background worker or Edge Function.
 */
export async function consumeAuditStream(
  severity: Severity,
  callback: (entry: AuditLogEntry) => Promise<void>
): Promise<void> {
  const streamKey = `audit:stream:${severity.toLowerCase()}`;
  const groupName = "audit-consumers";
  const consumerName = `consumer-${crypto.randomUUID()}`;

  try {
    // Create consumer group if not exists
    await auditRedis.xgroup("CREATE", streamKey, groupName, "0", "MKSTREAM");
  } catch {
    // Group may already exist, ignore error
  }

  // Read events (blocking for 5 seconds)
  const messages = await auditRedis.xreadgroup(
    groupName,
    consumerName,
    { [streamKey]: ">" },
    { count: 10, block: 5000 }
  );

  if (!messages) return;

  for (const message of messages) {
    for (const item of message.messages) {
      try {
        const entry = JSON.parse(item.message.entry as string) as AuditLogEntry;
        await callback(entry);
        // Acknowledge message
        await auditRedis.xack(streamKey, groupName, item.id);
      } catch (err) {
        console.error(`[AUDIT-CONSUMER] Failed to process message: ${err}`);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export {
  SuperAdminEvent,
  AdminEvent,
  PaymentEvent,
  UserEvent,
  SecurityEvent,
  Severity,
  auditRedis,
};