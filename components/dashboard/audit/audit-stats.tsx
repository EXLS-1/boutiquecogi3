type AuditStatusGroup = { status: string | null; _count: { id: number } };
type AuditEventGroup = { action: string; _count: { id: number } };

export function AuditStats({
  stats = [],
  events = [],
}: {
  stats?: AuditStatusGroup[];
  events?: AuditEventGroup[];
}) {
  return <div className="rounded-xl border bg-card p-4">Audit stats</div>;
}
