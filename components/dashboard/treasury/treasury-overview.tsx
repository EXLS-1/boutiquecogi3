export function TreasuryOverview({
  stats,
  paymentMethods = [],
}: {
  stats?: { _sum?: { amount: number }; _count?: number };
  paymentMethods?: unknown[];
  canViewAnalytics?: boolean;
}) {
  return <div className="rounded-xl border bg-card p-4">Treasury overview</div>;
}
