"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserWithRole } from "@/lib/auth/rbac";
import { ROLE_TO_LEVEL, type Role } from "@/lib/auth/rbac-shared";

const AUDIT_APPROVAL_POLICY = "DEFAULT_AUDIT_POLICY";

function isRole(value: string): value is Role {
  return Object.hasOwn(ROLE_TO_LEVEL, value);
}

function positiveMinutes(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 43_200) {
    throw new Error(`Configuration invalide de politique d'approbation: ${field}.`);
  }

  return value;
}

export async function requestAuditApproval(targetRole: Role, reason: string) {
  const userData = await getCurrentUserWithRole();
  if (!userData?.isAuthenticated) {
    return { success: false as const, error: "Authentification requise." };
  }

  if (
    !isRole(targetRole) ||
    ROLE_TO_LEVEL[targetRole] >= userData.level
  ) {
    return {
      success: false as const,
      error: "Le rôle demandé n'est pas accessible en mode audit.",
    };
  }

  if (typeof reason !== "string") {
    return { success: false as const, error: "Un motif valide est requis." };
  }

  const normalizedReason = reason.trim();
  if (!normalizedReason || normalizedReason.length > 1000) {
    return {
      success: false as const,
      error: "Le motif est requis et ne doit pas dépasser 1000 caractères.",
    };
  }

  const policy = await prisma.auditApprovalPolicy.findUnique({
    where: { policyName: AUDIT_APPROVAL_POLICY },
  });
  if (!policy?.isActive) {
    return {
      success: false as const,
      error: "La politique d'approbation d'audit est indisponible.",
    };
  }

  const requestTtlMinutes = positiveMinutes(policy.requestTtlMinutes, "requestTtlMinutes");
  const request = await prisma.auditApprovalRequest.create({
    data: {
      requesterId: userData.user.id,
      requesterRole: userData.role,
      requesterLevel: userData.level,
      targetRole,
      targetLevel: ROLE_TO_LEVEL[targetRole],
      reason: normalizedReason,
      status: "PENDING",
      expiresAt: new Date(Date.now() + requestTtlMinutes * 60_000),
    },
    select: { id: true },
  });

  return {
    success: true as const,
    requestId: request.id,
    message: "Votre demande a été envoyée pour approbation.",
  };
}

export async function validateAuditToken(token: string, targetRole: Role) {
  const userData = await getCurrentUserWithRole();
  if (!userData?.isAuthenticated) {
    return { valid: false as const, error: "Authentification requise." };
  }

  const normalizedToken = typeof token === "string" ? token.trim() : "";
  if (
    !normalizedToken ||
    !isRole(targetRole)
  ) {
    return { valid: false as const, error: "Token ou rôle d'audit invalide." };
  }

  const now = new Date();
  const request = await prisma.auditApprovalRequest.findFirst({
    where: {
      approvalToken: normalizedToken,
      requesterId: userData.user.id,
      targetRole,
      status: "APPROVED",
      expiresAt: { gt: now },
      approvalTokenExpiresAt: { gt: now },
    },
    select: {
      id: true,
      targetRole: true,
      approvalTokenExpiresAt: true,
    },
  });

  if (!request?.approvalTokenExpiresAt) {
    return {
      valid: false as const,
      error: "Token invalide, expiré ou non approuvé.",
    };
  }

  return {
    valid: true as const,
    request: {
      id: request.id,
      targetRole: request.targetRole,
      expiresAt: request.approvalTokenExpiresAt,
    },
  };
}
