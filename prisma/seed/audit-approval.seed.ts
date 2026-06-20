import { PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/uuid";
import { ROLES, PERMISSIONS } from "@/lib/auth/rbac";

interface AuditApprovalPolicy {
  policyName: string;
  label: string;
  description: string;
  approvalTokenTtlMinutes: number;
  requestTtlMinutes: number;
  whoCanApprove: string[];
  requiredPermissionApprove: string;
  minRoleLevelApprove: number;
  requiresDualApproval: boolean;
  isActive: boolean;
}

const AUDIT_APPROVAL_POLICIES: AuditApprovalPolicy[] = [
  {
    policyName: "DEFAULT_AUDIT_POLICY",
    label: "Politique d'approbation d'audit par défaut",
    description: "Tout basculement de rôle pour test nécessite une approbation explicite du SUPER_ADMIN (Level 1).",
    approvalTokenTtlMinutes: 5,
    requestTtlMinutes: 30,
    whoCanApprove: [ROLES.SUPER_ADMIN],
    requiredPermissionApprove: PERMISSIONS.AUDIT_APPROVE_REQUEST,
    minRoleLevelApprove: 1,
    requiresDualApproval: false,
    isActive: true,
  },
];

export async function seedAuditApprovalPolicies(prisma: PrismaClient) {
  console.log("🔐 [RBAC] Configuration des politiques d'approbation d'audit...");
  for (const policy of AUDIT_APPROVAL_POLICIES) {
    await prisma.auditApprovalPolicy.upsert({
      where: { policyName: policy.policyName },
      update: {
        label: policy.label,
        description: policy.description,
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
        description: policy.description,
        approvalTokenTtlMinutes: policy.approvalTokenTtlMinutes,
        requestTtlMinutes: policy.requestTtlMinutes,
        whoCanApprove: policy.whoCanApprove,
        requiredPermissionApprove: policy.requiredPermissionApprove,
        minRoleLevelApprove: policy.minRoleLevelApprove,
        requiresDualApproval: policy.requiresDualApproval,
        isActive: policy.isActive,
      },
    });
    console.log(`   ✓ ${policy.label} [tokenTTL:${policy.approvalTokenTtlMinutes}min, requestTTL:${policy.requestTtlMinutes}min, approve:L${policy.minRoleLevelApprove}]`);
  }
  console.log(`🔐 [RBAC] ${AUDIT_APPROVAL_POLICIES.length} politiques d'approbation d'audit configurées.`);
}
