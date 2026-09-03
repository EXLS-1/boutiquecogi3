export function PromotionsTable({ promotions = [] }: { promotions?: unknown[]; canCreate?: boolean; canUpdate?: boolean; canDelete?: boolean }) {
  return <div className="rounded-xl border bg-card p-4">Promotions table ({promotions.length})</div>;
}
