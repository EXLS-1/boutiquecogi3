// components/admin/products/kpi-card.tsx
export function KpiCard({ title, value, icon: Icon, trend }: {
  title: string; value: number | string; icon: any; trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        {Icon && <Icon className="w-5 h-5 text-slate-500" />}
        <span className="text-sm font-medium text-slate-600">{title}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {trend && <span className={`text-xs mt-1 ${trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-slate-500"}`}>
        {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
      </span>}
    </div>
  );
}
