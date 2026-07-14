// lib/auth/audit-approval.ts
// ============================================
// GESTION DES APPROBATIONS D'AUDIT — VALIDATION SUPER_ADMIN
// ============================================
// Module PUREMENT server-side. Gère le cycle de vie des tokens d'approbation.

"use server";

import { prisma } from "@/lib/prisma";
import { generateUUIDv7 } from "@/lib/uuid";
import {
  ROLES,
  PERMISSIONS,
  RESTRICTIONS,
  type Role,
  getRoleLevel,
  hasPermission,
  getRestrictionValue,
  isRestrictionEnabled,
  getCurrentUserWithRole,
  invalidateRBACCache,
} from "@/lib/auth/rbac";
import { logAudit } from "@/lib/auth/server";

// ───────────────────────────────────────────
// SCHÉMA PRISMA REQUIS
// ───────────────────────────────────────────
//
// model AuditApprovalRequest {
//   id                     String   @id @default(uuid())
//   requesterId            String
//   requesterRole          String
//   requesterLevel         Int
//   targetRole             String
//   targetLevel            Int
//   reason                 String
//   status                 String   // PENDING | APPROVED | REJECTED | EXPIRED | REVOKED
//   approvedById           String?
//   approvedByRole         String?
//   expiresAt              DateTime
//   createdAt              DateTime @default(now())
//   updatedAt              DateTime @updatedAt
//   approvalToken          String?  @unique
//   approvalTokenExpiresAt DateTime?
// }
//
// N'oubliez pas d'ajouter les permissions audit:* dans votre seed RBAC :
//   - audit:switch-self
//   - audit:switch-others
//   - audit:approve-request
//   - audit:view-logs
// ───────────────────────────────────────────

// ───────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────

export interface AuditApprovalRequest {
  id: string;
  requesterId: string;
  requesterRole: Role;
  requesterLevel: number;
  targetRole: Role;
  targetLevel: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "REVOKED";
  approvedById?: string | null;
  approvedByRole?: Role | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditApprovalToken {
  token: string;
  requestId: string;
  expiresAt: Date;
}

// ───────────────────────────────────────────
// CONSTANTES
// ───────────────────────────────────────────

const APPROVAL_TOKEN_TTL_MINUTES = 5;        // Durée de validité du token d'approbation
const APPROVAL_REQUEST_TTL_MINUTES = 30;     // Durée max pour qu'un SUPER_ADMIN approuve

// ───────────────────────────────────────────
// 1. DEMANDE D'APPROBATION (par l'utilisateur Level 2-5)
// ───────────────────────────────────────────

/**
 * Crée une demande d'approbation pour basculer vers un rôle cible.
 * Nécessite : permission AUDIT_SWITCH_SELF + restriction REQUIRES_AUDIT_APPROVAL.
 */
export async function requestAuditApproval(
  targetRole: Role,
  reason: string,
): Promise<{ success: false; error: string } | { success: true; requestId: string; message: string }> {
  const userData = await getCurrentUserWithRole();
  if (!userData) {
    return { success: false, error: "Authentification requise." };
  }

  const { user, role: requesterRole } = userData;
  const requesterLevel = getRoleLevel(requesterRole);

  // Vérifie la permission de switch
  if (!(await hasPermission(requesterRole, PERMISSIONS["audit:switch-self"]))) {
    return { success: false, error: "Permission 'audit:switch-self' requise." };
  }

  // Vérifie si l'approbation est requise pour ce rôle
  const requiresApproval = await isRestrictionEnabled(requesterRole, RESTRICTIONS.REQUIRES_AUDIT_APPROVAL);
  if (!requiresApproval) {
    // Pas besoin d'approbation — retourne un succès direct avec un token auto-généré
    return { 
      success: true, 
      requestId: "AUTO_APPROVED",
      message: "Aucune approbation requise pour ce rôle." 
    };
  }

  // Vérifie la hiérarchie : le rôle cible doit être inférieur
  const targetLevel = getRoleLevel(targetRole);
  if (requesterLevel >= targetLevel) {
    return { 
      success: false, 
      error: `Impossible d'auditer un niveau supérieur ou égal (vous: ${requesterLevel}, cible: ${targetLevel}).` 
    };
  }

  // Vérifie les levels cibles autorisés
  const allowedLevelsStr = await getRestrictionValue(requesterRole, RESTRICTIONS.AUDIT_ALLOWED_TARGET_LEVELS);
  const allowedLevels = (allowedLevelsStr as string).split(",").map(Number);
  if (!allowedLevels.includes(targetLevel)) {
    return { 
      success: false, 
      error: `Niveau cible ${targetLevel} non autorisé. Levels autorisés: ${allowedLevels.join(", ")}.` 
    };
  }

  // Vérifie s'il existe déjà une demande en cours
  const existingPending = await prisma.auditApprovalRequest.findFirst({
    where: {
      requesterId: user.id,
      targetRole,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
  });

  if (existingPending) {
    return { 
      success: false, 
      error: "Une demande d'approbation est déjà en cours pour ce rôle." 
    };
  }

  // Crée la demande
  const requestId = generateUUIDv7();
  const expiresAt = new Date(Date.now() + APPROVAL_REQUEST_TTL_MINUTES * 60 * 1000);

  await prisma.auditApprovalRequest.create({
    data: {
      id: requestId,
      requesterId: user.id,
      requesterRole,
      requesterLevel,
      targetRole,
      targetLevel,
      reason: reason.trim(),
      status: "PENDING",
      expiresAt,
    },
  });

  // Log l'action
  await logAudit({
    userId: user.id,
    role: requesterRole,
    action: "AUDIT_APPROVAL_REQUESTED",
    resource: "audit-approval",
    resourceId: requestId,
    success: true,
    details: `Demande d'audit vers ${targetRole} (niveau ${targetLevel}). Raison: ${reason}`,
  });

  return { 
    success: true, 
    requestId,
    message: `Demande soumise. En attente d'approbation par un ${ROLES.SUPER_ADMIN}.` 
  };
}

// ───────────────────────────────────────────
// 2. APPROBATION PAR SUPER_ADMIN (Level 1)
// ───────────────────────────────────────────

/**
 * Approuve ou rejette une demande d'audit.
 * Nécessite : rôle SUPER_ADMIN (Level 1) + permission AUDIT_APPROVE_REQUEST.
 */
export async function approveAuditRequest(
  requestId: string,
  approve: boolean,
  adminNotes?: string,
): Promise<{ success: false; error: string } | { success: true; token?: string; message: string }> {
  const userData = await getCurrentUserWithRole();
  if (!userData) {
    return { success: false, error: "Authentification requise." };
  }

  const { user, role: adminRole } = userData;

  // Vérifie que l'approbateur est SUPER_ADMIN
  if (adminRole !== ROLES.SUPER_ADMIN) {
    return { success: false, error: "Opération réservée au SUPER_ADMIN (Level 1)." };
  }

  // Vérifie la permission explicite
  if (!(await hasPermission(adminRole, PERMISSIONS["audit:approve-request"]))) {
    return { success: false, error: "Permission 'audit:approve-request' requise." };
  }

  // Récupère la demande
  const request = await prisma.auditApprovalRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    return { success: false, error: "Demande introuvable." };
  }

  if (request.status !== "PENDING") {
    return { success: false, error: `Demande déjà ${request.status.toLowerCase()}.` };
  }

  if (new Date() > request.expiresAt) {
    await prisma.auditApprovalRequest.update({
      where: { id: requestId },
      data: { status: "EXPIRED", updatedAt: new Date() },
    });
    return { success: false, error: "La demande a expiré." };
  }

  // Si rejet
  if (!approve) {
    await prisma.auditApprovalRequest.update({
      where: { id: requestId },
      data: { 
        status: "REJECTED", 
        approvedById: user.id,
        approvedByRole: adminRole,
        updatedAt: new Date() 
      },
    });

    await logAudit({
      userId: user.id,
      role: adminRole,
      action: "AUDIT_APPROVAL_REJECTED",
      resource: "audit-approval",
      resourceId: requestId,
      success: true,
      details: `Rejet de la demande de ${request.requesterRole} vers ${request.targetRole}. Notes: ${adminNotes ?? "N/A"}`,
    });

    return { success: true, message: "Demande rejetée." };
  }

  // Génère le token d'approbation
  const token = generateUUIDv7();
  const tokenExpiresAt = new Date(Date.now() + APPROVAL_TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.auditApprovalRequest.update({
    where: { id: requestId },
    data: {
      status: "APPROVED",
      approvedById: user.id,
      approvedByRole: adminRole,
      updatedAt: new Date(),
      approvalToken: token,
      approvalTokenExpiresAt: tokenExpiresAt,
    },
  });

  await logAudit({
    userId: user.id,
    role: adminRole,
    action: "AUDIT_APPROVAL_GRANTED",
    resource: "audit-approval",
    resourceId: requestId,
    success: true,
    details: `Approbation de ${request.requesterRole} vers ${request.targetRole}. Token valide jusqu'à ${tokenExpiresAt.toISOString()}`,
  });

  return { 
    success: true, 
    token,
    message: `Demande approuvée. Token valide ${APPROVAL_TOKEN_TTL_MINUTES} minutes.` 
  };
}

// ───────────────────────────────────────────
// 3. VALIDATION DU TOKEN (avant le switch)
// ───────────────────────────────────────────

/**
 * Valide un token d'approbation et retourne la demande associée.
 * Appelée par le client avant de déclencher startAudit().
 */
export async function validateAuditToken(
  token: string,
): Promise<{ valid: false; error: string } | { valid: true; request: AuditApprovalRequest }> {
  const request = await prisma.auditApprovalRequest.findFirst({
    where: {
      approvalToken: token,
      status: "APPROVED",
      approvalTokenExpiresAt: { gt: new Date() },
    },
  });

  if (!request) {
    return { valid: false, error: "Token invalide ou expiré." };
  }

  // Vérifie que le demandeur est bien celui qui valide
  const userData = await getCurrentUserWithRole();
  if (!userData || userData.user.id !== request.requesterId) {
    return { valid: false, error: "Token non associé à votre session." };
  }

  return { valid: true, request: request as AuditApprovalRequest };
}

// ───────────────────────────────────────────
// 4. RÉVOCATION (par le SUPER_ADMIN ou expiration)
// ───────────────────────────────────────────

/**
 * Révoque une approbation active.
 */
export async function revokeAuditApproval(requestId: string): Promise<{ success: boolean; message: string }> {
  const userData = await getCurrentUserWithRole();
  if (!userData) {
    return { success: false, message: "Authentification requise." };
  }

  const { user, role } = userData;

  // Seul le SUPER_ADMIN ou le demandeur peut révoquer
  const request = await prisma.auditApprovalRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    return { success: false, message: "Demande introuvable." };
  }

  const canRevoke = role === ROLES.SUPER_ADMIN || user.id === request.requesterId;
  if (!canRevoke) {
    return { success: false, message: "Permission insuffisante pour révoquer." };
  }

  await prisma.auditApprovalRequest.update({
    where: { id: requestId },
    data: { status: "REVOKED", updatedAt: new Date() },
  });

  // Invalide le cache RBAC du demandeur
  invalidateRBACCache(request.requesterRole as Role);

  await logAudit({
    userId: user.id,
    role,
    action: "AUDIT_APPROVAL_REVOKED",
    resource: "audit-approval",
    resourceId: requestId,
    success: true,
    details: `Révocation par ${role}`,
  });

  return { success: true, message: "Approbation révoquée." };
}

// ───────────────────────────────────────────
// 5. LISTE DES DEMANDES (pour le SUPER_ADMIN)
// ───────────────────────────────────────────

/**
 * Liste toutes les demandes d'approbation en attente.
 * Nécessite : SUPER_ADMIN.
 */
export async function getPendingAuditRequests(): Promise<{ success: false; error: string } | { success: true; requests: AuditApprovalRequest[] }> {
  const userData = await getCurrentUserWithRole();
  if (!userData || userData.role !== ROLES.SUPER_ADMIN) {
    return { success: false, error: "Accès réservé au SUPER_ADMIN." };
  }

  const requests = await prisma.auditApprovalRequest.findMany({
    where: { status: "PENDING", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "asc" },
  });

  return { success: true, requests: requests as AuditApprovalRequest[] };
}

// ───────────────────────────────────────────
// 6. NETTOYAGE DES EXPIRÉS (cron ou manuel)
// ───────────────────────────────────────────

/**
 * Marque comme EXPIRED les demandes dépassées.
 * Peut être appelé par un cron job ou manuellement.
 */
export async function cleanupExpiredAuditRequests(): Promise<number> {
  const result = await prisma.auditApprovalRequest.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  return result.count;
}
