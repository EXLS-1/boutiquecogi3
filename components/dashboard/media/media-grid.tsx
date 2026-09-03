export function MediaGrid({
  media = [],
  total = 0,
}: {
  media?: unknown[];
  total?: number;
  page?: number;
  limit?: number;
  canDelete?: boolean;
  canOrganize?: boolean;
}) {
  return <div className="rounded-xl border bg-card p-4">Media grid ({total} items)</div>;
}
