export function AuditFilters({ events = [], canExport = false }: {
  events?: string[];
  canExport?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      Audit filters · {events.length} event{events.length > 1 ? "s" : ""}
      {canExport ? " · export" : ""}
    </div>
  );
}
