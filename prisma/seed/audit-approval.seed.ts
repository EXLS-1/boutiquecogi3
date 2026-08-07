import type { PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/utils/uuid";
import { ROLES, PERMISSIONS, LEVELS } from "@/lib/auth/rbac";

export type AuditApprovalPolicy = {
  policyName: string;
  label: string;
  description?: string | null;
  approvalTokenTtlMinutes: number;
  requestTtlMinutes: number;
  whoCanApprove: string[];
  requiredPermissionApprove: string;
  minRoleLevelApprove: number;
  requiresDualApproval: boolean;
  isActive: boolean;
};

const AUDIT_APPROVAL_POLICIES: AuditApprovalPolicy[] = [
  {
    policyName: "DEFAULT_AUDIT_POLICY",
    label: "Politique d'approbation d'audit par défaut",
    description: "Tout basculement de rôle pour test nécessite une approbation explicite du SUPER_ADMIN (Level 1).",
    approvalTokenTtlMinutes: 5,
    requestTtlMinutes: 30,
    whoCanApprove: [ROLES.SUPER_ADMIN],
    requiredPermissionApprove: PERMISSIONS["audit:approve-request"],
    minRoleLevelApprove: LEVELS.LEVEL_1,
    requiresDualApproval: false,
    isActive: true,
  },
];

export async function seedAuditApprovalPolicies(prisma: PrismaClient) {
  console.log("🔐 [RBAC] Configuration atomique des politiques d'approbation d'audit...");

  await prisma.$transaction(
    AUDIT_APPROVAL_POLICIES.map((policy) =>
      prisma.auditApprovalPolicy.upsert({
        where: { policyName: policy.policyName },
        update: {
          label: policy.label,
          description: policy.description ?? null,
          approvalTokenTtlMinutes: policy.approvalTokenTtlMinutes,
          requestTtlMinutes: policy.requestTtlMinutes,
          whoCanApprove: policy.whoCanApprove,
          requiredPermissionApprove: policy.requiredPermissionApprove,
          minRoleLevelApprove: policy.minRoleLevelApprove,
          requiresDualApproval: policy.requiresDualApproval,
          isActive: policy.isActive,
        },
        create: {
          id: generateUUIDv7(),
          policyName: policy.policyName,
          label: policy.label,
          description: policy.description ?? null,
          approvalTokenTtlMinutes: policy.approvalTokenTtlMinutes,
          requestTtlMinutes: policy.requestTtlMinutes,
          whoCanApprove: policy.whoCanApprove,
          requiredPermissionApprove: policy.requiredPermissionApprove,
          minRoleLevelApprove: policy.minRoleLevelApprove,
          requiresDualApproval: policy.requiresDualApproval,
          isActive: policy.isActive,
        },
      })
    )
  );

  console.log(`🔐 [RBAC] ${AUDIT_APPROVAL_POLICIES.length} politiques d'approbation d'audit configurées.`);
}
