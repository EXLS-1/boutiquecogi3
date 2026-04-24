import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export function auditLog(params: Prisma.AuditLogCreateInput) {
  return prisma.auditLog
    .create({ data: params })
    .catch((error: unknown) => {
      console.error("Audit log failed", error);
    });
}
