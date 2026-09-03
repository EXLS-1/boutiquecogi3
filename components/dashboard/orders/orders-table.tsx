export function OrdersTable({
  total = 0,
}: {
  orders?: unknown[];
  total?: number;
  page?: number;
  limit?: number;
  canManage?: boolean;
  canRefund?: boolean;
  canCancel?: boolean;
}) {
  return <div className="rounded-xl border bg-card p-4">Orders table ({total})</div>;
}
