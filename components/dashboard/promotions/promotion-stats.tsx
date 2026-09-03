export function PromotionStats({ stats }: { stats?: { _count?: { id: number }; _sum?: { discountValue: number } } }) {
  return <div className="rounded-xl border bg-card p-4">Promotion stats</div>;
}
