export function OrderStatusFilter({ activeStatus }: { activeStatus?: string }) {
  return <div className="rounded-xl border bg-card p-4">Order status: {activeStatus ?? "all"}</div>;
}
