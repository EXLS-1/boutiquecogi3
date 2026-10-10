export interface RevenueDatum {
  createdAt: Date;
  total: number;
  orders: number;
}

export function RevenueChart({ data = [] }: { data?: RevenueDatum[] }) {
  const total = data.reduce((sum, row) => sum + (Number.isFinite(row.total) ? row.total : 0), 0);
  return (
    <div className="rounded-xl border bg-card p-4">
      Revenue chart · {data.length} point{data.length > 1 ? "s" : ""} · {total.toLocaleString()} FCFA
    </div>
  );
}
