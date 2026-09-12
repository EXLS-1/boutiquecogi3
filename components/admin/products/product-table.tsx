// components/admin/products/product-table.tsx
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mapProductToListItem } from "@/lib/products/product.mapper";
import { ProductStatusBadge } from "./product-status-badge";
import { ProductStockBadge } from "./product-stock-badge";
import type { ProductListResult } from "@/lib/products/types";

export function ProductTable({ result }: { result: ProductListResult }) {
  if (!result?.items) return <p className="text-slate-500">Aucun produit.</p>;
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="text-left p-3">Produit</th>
            <th className="text-left p-3">SKU</th>
            <th className="text-right p-3">Prix</th>
            <th className="text-right p-3">Stock</th>
            <th className="p-3">Statut</th>
            <th className="p-3">Type</th>
            <th className="p-3">Catalogues</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((row) => {
            const item = mapProductToListItem(row as any);
            return (
              <tr key={item.id} className="border-b hover:bg-slate-50">
                <td className="p-3">
                  <Link href={`/admin/products/${item.id}`} className="font-medium text-slate-900 hover:underline">{item.name}</Link>
                </td>
                <td className="p-3"><code className="text-xs bg-slate-100 px-2 py-1 rounded">{item.sku}</code></td>
                <td className="p-3 text-right">{item.basePriceCents !== undefined ? `${item.basePriceCents} ${item.currency}` : "—"}</td>
                <td className="p-3 text-right"><ProductStockBadge available={item.available} /></td>
                <td className="p-3"><ProductStatusBadge status={item.status} /></td>
                <td className="p-3">{item.productType ?? "—"}</td>
                <td className="p-3">{item.catalogCount}</td>
                <td className="p-3">
                  <Link href={`/admin/products/${item.id}/edit`} className="text-xs text-slate-600 hover:text-slate-900">Modifier</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex justify-between items-center p-4 border-t">
        <span className="text-sm text-slate-600">{result.items.length} sur {result.total} produits</span>
        <div className="flex gap-2">
          {result.nextCursor ? <button className="p-1"><ChevronLeft className="w-4 h-4" /></button> : <div />}
          <button disabled={!result.nextCursor} className={`p-1 ${result.nextCursor ? "text-slate-700" : "text-slate-300"}`}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
