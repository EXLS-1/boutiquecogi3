export function MediaFilters({ buckets = [] }: { buckets?: Array<{ bucket: string; _count?: { id: number } }> }) {
  return <div className="rounded-xl border bg-card p-4">Media filters ({buckets.length})</div>;
}
