import { AuditSeverity, Prisma } from "@prisma/client";

export type AuditActorType =
  | "user"
  | "system"
  | "service_account"
  | "admin"
  | "anonymous";

export interface AuditOutboxPayload {
  createdAt: string;
  userId: string | null;
  actorId: string;
  actorType: AuditActorType;
  impersonatedBy: string | null;
  roleLevel: number;
  action: string;
  targetId: string | null;
  targetType: string | null;
  entityId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  severity: AuditSeverity;
  status: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  sessionId: string | null;
  traceId: string | null;
  reason: string | null;
  error: string | null;
  errorCode: string | null;
}

export function toAuditJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  const serialized = JSON.stringify(value);
  if (serialized === undefined) return undefined;
  return JSON.parse(serialized) as Prisma.InputJsonValue;
}

function isRecord(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: Prisma.JsonValue | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function optionalJson(
  value: Prisma.JsonValue | undefined,
): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return value as Prisma.InputJsonValue;
}

export function parseAuditOutboxPayload(
  value: Prisma.JsonValue,
): AuditOutboxPayload | null {
  if (!isRecord(value)) return null;

  const payload = value;
  const action = payload.action;
  const actorId = payload.actorId;
  const actorType = payload.actorType;
  const createdAt = payload.createdAt;
  const severity = payload.severity;
  const status = payload.status;
  const roleLevel = payload.roleLevel;
  const validActorTypes: readonly string[] = [
    "user",
    "system",
    "service_account",
    "admin",
    "anonymous",
  ];
  const validSeverities: readonly string[] = Object.values(AuditSeverity);

  if (
    typeof action !== "string" ||
    typeof actorId !== "string" ||
    typeof actorType !== "string" ||
    !validActorTypes.includes(actorType) ||
    typeof createdAt !== "string" ||
    !Number.isFinite(Date.parse(createdAt)) ||
    typeof severity !== "string" ||
    !validSeverities.includes(severity) ||
    typeof status !== "string" ||
    typeof roleLevel !== "number" ||
    !Number.isInteger(roleLevel)
  ) {
    return null;
  }

  return {
    createdAt,
    userId: optionalString(payload.userId),
    actorId,
    actorType: actorType as AuditActorType,
    impersonatedBy: optionalString(payload.impersonatedBy),
    roleLevel,
    action,
    targetId: optionalString(payload.targetId),
    targetType: optionalString(payload.targetType),
    entityId: optionalString(payload.entityId),
    resourceType: optionalString(payload.resourceType),
    resourceId: optionalString(payload.resourceId),
    actorName: optionalString(payload.actorName),
    actorEmail: optionalString(payload.actorEmail),
    severity: severity as AuditSeverity,
    status,
    oldValue: optionalJson(payload.oldValue),
    newValue: optionalJson(payload.newValue),
    metadata: optionalJson(payload.metadata),
    details: optionalString(payload.details),
    ipAddress: optionalString(payload.ipAddress),
    userAgent: optionalString(payload.userAgent),
    browser: optionalString(payload.browser),
    os: optionalString(payload.os),
    device: optionalString(payload.device),
    sessionId: optionalString(payload.sessionId),
    traceId: optionalString(payload.traceId),
    reason: optionalString(payload.reason),
    error: optionalString(payload.error),
    errorCode: optionalString(payload.errorCode),
  };
}
