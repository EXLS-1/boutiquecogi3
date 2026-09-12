// components/admin/products/product-overview-card.tsx
import { Package, Tag, BarChart3 } from "lucide-react";

export function ProductOverviewCard({ product }: { product: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2"><Package className="w-4 h-4" /><span className="text-sm text-slate-600">Base SKU</span></div>
        <code className="text-lg font-mono bg-slate-100 px-3 py-2 rounded">{product.sku ?? "—"}</code>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2"><Tag className="w-4 h-4" /><span className="text-sm text-slate-600">Type</span></div>
        <span className="text-lg text-slate-900">{product.productType?.type ?? "Non défini"}</span>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2"><BarChart3 className="w-4 h-4" /><span className="text-sm text-slate-600">Vues / Ventes</span></div>
        <div className="text-lg text-slate-900">{product.soldCount ?? 0} unités vendues</div>
      </div>
    </div>
  );
}
