export function OrderStatsCards({ stats = [] }: { stats?: Array<{ _count?: { id: number }; _sum?: { totalAmount: number } }> }) {
  return <div className="rounded-xl border bg-card p-4">Order stats</div>;
}
