export function auditLog(params: AuditParams) {
  prisma.auditLog
    .create({ data: params })
    .catch((err) => {
      console.error("Audit log failed", err);
    });
}