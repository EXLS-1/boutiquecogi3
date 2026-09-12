// components/admin/products/variant-table.tsx
import Link from "next/link";
import { Package } from "lucide-react";

export function VariantTable({ variants, productId }: { variants: any[]; productId: string }) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="text-left p-3">SKU</th>
            <th className="text-left p-3">Attributs</th>
            <th className="text-right p-3">Écart prix</th>
            <th className="text-right p-3">Stock</th>
            <th className="p-3">Actif</th>
          </tr>
        </thead>
        <tbody>
          {variants?.map((v) => (
            <tr key={v.id} className="border-b">
              <td className="p-3"><code className="bg-slate-100 px-2 py-1 rounded text-xs">{v.sku}</code></td>
              <td className="p-3">{JSON.stringify(v.attributes)}</td>
              <td className="p-3 text-right">{v.priceOffset ?? 0}¢</td>
              <td className="p-3 text-right">
                {v.variantStocks?.map((vs: any) => `${vs.quantity - vs.reserved}`).join(", ") ?? "0"}
              </td>
              <td className="p-3">{v.isActive ? "✓" : "✗"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
