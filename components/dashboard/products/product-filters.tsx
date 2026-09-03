export function ProductFilters({ categories = [] }: { categories?: Array<{ id: string; name: string }> }) {
  return <div className="rounded-xl border bg-card p-4">Product filters ({categories.length})</div>;
}
