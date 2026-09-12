// components/admin/products/product-analytics.tsx
export function ProductAnalytics({ analytics }: { analytics: any }) {
  if (!analytics) return <p className="text-slate-500">Aucune donnée analytique.</p>;
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-white border rounded-lg p-4"><span className="text-sm text-slate-600">Vues</span><div className="text-xl font-bold">{analytics.viewCount ?? 0}</div></div>
      <div className="bg-white border rounded-lg p-4"><span className="text-sm text-slate-600">Commandes</span><div className="text-xl font-bold">{analytics.orderCount ?? 0}</div></div>
      <div className="bg-white border rounded-lg p-4"><span className="text-sm text-slate-600">Unités vendues</span><div className="text-xl font-bold">{analytics.unitsSold ?? 0}</div></div>
      <div className="bg-white border rounded-lg p-4"><span className="text-sm text-slate-600">Note moyenne</span><div className="text-xl font-bold">{analytics.averageRating ?? "—"}</div></div>
    </div>
  );
}
