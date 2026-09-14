// components/admin/products/inventory-dashboard.tsx
// COMPONENT — Dashboard d'inventaire (portail admin produits)
// =============================================================================
// Affiche les produits avec leur stock disponible et l'état de disponibilité.
// =============================================================================

"use client";

import { Package, RefreshCw } from "lucide-react";

type StockRow = {
  quantity: number;
  reserved: number;
};

type InventoryProduct = {
  id: string;
  name: string;
  sku: string;
  stock?: { quantity: number; reserved: number } | null;
  availabilityProjection?: { isAvailable: boolean } | null;
  variants?: Array<{ variantStocks?: StockRow[] }>;
};

type InventoryDashboardProps = {
  data: InventoryProduct[];
};

export function InventoryDashboard({ data }: InventoryDashboardProps) {
  const available = (stock?: { quantity: number; reserved: number } | null) =>
    (stock?.quantity ?? 0) - (stock?.reserved ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Inventaire</h3>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded hover:bg-slate-800 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Ajuster le stock
        </button>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun produit.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left">
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2">Produit</th>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2 text-right">Disponible</th>
                <th className="px-4 py-2">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((product) => {
                const count = available(product.stock);
                return (
                  <tr key={product.id}>
                    <td className="px-4 py-2 font-medium text-slate-700">
                      {product.name}
                    </td>
                    <td className="px-4 py-2">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {product.sku}
                      </code>
                    </td>
                    <td className="px-4 py-2 text-right text-slate-700">
                      {count}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center gap-1 text-xs ${
                          product.availabilityProjection?.isAvailable
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        <Package className="h-3 w-3" />
                        {product.availabilityProjection?.isAvailable
                          ? "Disponible"
                          : "Rupture"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-400">
            {data.length} produits affichés
          </div>
        </div>
      )}
    </div>
  );
}