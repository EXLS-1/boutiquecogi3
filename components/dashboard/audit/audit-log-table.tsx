export interface AuditLogRow {
  id: string;
  action: string;
  status: string;
  createdAt: Date;
  user?: { id: string; email: string | null; name: string | null } | null;
}

export function AuditLogTable({ logs = [], total = 0, page = 1 }: {
  logs?: AuditLogRow[];
  total?: number;
  page?: number;
  limit?: number;
  canConfigure?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      Audit log table · {logs.length}/{total} (page {page})
    </div>
  );
}
